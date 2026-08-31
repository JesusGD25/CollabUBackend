import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { MessageType } from './entities/message.entity';

@WebSocketGateway({
  path: '/ws/chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // Mapeo en memoria: userId -> Set de socket.id
  private readonly activeUsers = new Map<string, Set<string>>();

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway inicializado');
  }

  async handleConnection(client: Socket) {
    try {
      let token = client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!token) {
        throw new UnauthorizedException('Token no proporcionado');
      }

      // Si el token tiene formato Bearer, limpiarlo
      if (token.startsWith('Bearer ')) {
        token = token.substring(7);
      }

      // Validar token JWT
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Token inválido');
      }

      const userId = payload.sub;
      client.data.user = {
        id: userId,
        email: payload.email,
        role: payload.role,
      };

      this.logger.log(`Cliente conectado: ${client.id} (Usuario: ${userId})`);

      // Registrar socket en el mapa de usuarios activos
      let userSockets = this.activeUsers.get(userId);
      if (!userSockets) {
        userSockets = new Set<string>();
        this.activeUsers.set(userId, userSockets);
      }
      userSockets.add(client.id);

      // Si es el primer socket de este usuario que se conecta, notificar estado online
      if (userSockets.size === 1) {
        await this.broadcastUserStatus(userId, 'online');
      }
    } catch (error) {
      this.logger.error(`Fallo de conexión en ChatGateway: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    if (userId && this.activeUsers.has(userId)) {
      const sockets = this.activeUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        this.logger.log(`Cliente desconectado: ${client.id} (Usuario: ${userId})`);

        // Si el usuario ya no tiene sockets activos, marcarlo como offline
        if (sockets.size === 0) {
          this.activeUsers.delete(userId);
          await this.broadcastUserStatus(userId, 'offline');
        }
      }
    } else {
      this.logger.log(`Cliente desconectado (sin autenticación previa): ${client.id}`);
    }
  }

  /**
   * Difunde el estado del usuario (online/offline) a todas las conversaciones activas en las que participa
   */
  private async broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    try {
      const conversationIds = await this.chatService.getUserConversationIds(userId);
      this.logger.log(`Difundiendo estado "${status}" del usuario ${userId} a ${conversationIds.length} conversaciones`);
      for (const conversationId of conversationIds) {
        this.server.to(`conversation_${conversationId}`).emit('user_status', {
          userId,
          status,
        });
      }
    } catch (error) {
      this.logger.error(`Error al difundir estado del usuario ${userId}: ${error.message}`);
    }
  }

  @SubscribeMessage('join')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      throw new WsException('Usuario no autenticado');
    }

    // Validar participación real en la conversación
    const isMember = await this.chatService.isParticipant(data.conversationId, userId);
    if (!isMember) {
      throw new WsException('No eres participante de esta conversación');
    }

    client.join(`conversation_${data.conversationId}`);
    this.logger.log(`Cliente ${client.id} (Usuario: ${userId}) se unió a la sala conversation_${data.conversationId}`);

    // Obtener los últimos 50 mensajes de historial
    const history = await this.chatService.getMessages(userId, data.conversationId, { limit: 50 });

    // Enviar el historial de mensajes de forma directa al cliente recién conectado
    client.emit('message_history', {
      conversationId: data.conversationId,
      messages: history.data,
      hasMore: history.hasMore,
    });

    return { event: 'joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('leave')
  handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conversation_${data.conversationId}`);
    this.logger.log(`Cliente ${client.id} salió de la sala conversation_${data.conversationId}`);
    return { event: 'left', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) return;

    // Emitir el evento de escritura al resto de participantes en la sala
    client.to(`conversation_${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('read')
  async handleMarkAsRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      throw new WsException('Usuario no autenticado');
    }

    this.logger.log(`Cliente ${client.id} (Usuario: ${userId}) marcó como leída la conversación ${data.conversationId}`);
    
    // Persistir estado de lectura en base de datos
    const result = await this.chatService.markConversationAsRead(userId, data.conversationId);

    // Notificar a otros miembros del canal que el usuario leyó los mensajes
    client.to(`conversation_${data.conversationId}`).emit('read', {
      conversationId: data.conversationId,
      userId,
      lastReadAt: new Date(),
    });

    return { event: 'read_success', data: { conversationId: data.conversationId, count: result.count } };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: { conversationId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      throw new WsException('Usuario no autenticado');
    }

    // Persistir el mensaje. `ChatService.sendMessage` ya difunde por socket a
    // la sala con el senderName correcto para receptores, así que NO volvemos
    // a emitir aquí — un segundo emit produciría el mismo mensaje duplicado
    // en el cliente (bug NG0955).
    await this.chatService.sendMessage(userId, data.conversationId, {
      content: data.content,
      type: MessageType.TEXT,
    });
  }
}

