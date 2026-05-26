import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  path: '/ws/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  // Mapa para trackear conexiones por userId
  private userSockets = new Map<string, string[]>();

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Notification WebSocket Gateway inicializado');
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
      client.data.userId = userId;
      client.data.user = {
        id: userId,
        email: payload.email,
        role: payload.role,
      };

      this.logger.log(`Cliente conectado a notificaciones: ${client.id} (Usuario: ${userId})`);

      // Suscripción automática a la sala de notificaciones del usuario
      client.join(`user_${userId}`);

      // Registrar socket en el mapa
      let sockets = this.userSockets.get(userId) || [];
      if (!sockets.includes(client.id)) {
        sockets.push(client.id);
      }
      this.userSockets.set(userId, sockets);

      // Emitir conteo inicial de no leídas al conectar
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });
      this.logger.log(`Contador inicial enviado a usuario ${userId}: ${unreadCount} no leídas`);

    } catch (error) {
      this.logger.error(`Fallo de conexión en notificaciones: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId || client.data.user?.id;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        const index = sockets.indexOf(client.id);
        if (index !== -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
        } else {
          this.userSockets.set(userId, sockets);
        }
      }
      this.logger.log(`Cliente desconectado de notificaciones: ${client.id} (Usuario: ${userId})`);
    } else {
      this.logger.log(`Cliente desconectado de notificaciones (sin autenticación previa): ${client.id}`);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId || client.data.user?.id || data.userId;
    // Unirse a una sala privada para este usuario (por si acaso no se unió al conectar)
    client.join(`user_${userId}`);
    client.data.userId = userId;
    
    // Registrar en el mapa por si acaso
    let sockets = this.userSockets.get(userId) || [];
    if (!sockets.includes(client.id)) {
      sockets.push(client.id);
    }
    this.userSockets.set(userId, sockets);

    this.logger.log(`Cliente ${client.id} re-suscrito a notificaciones del usuario ${userId}`);
    return { event: 'subscribed', data: { userId } };
  }

  /**
   * Método para ser llamado desde el servicio cuando llega una nueva notificación
   */
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  /**
   * Método para enviar el contador de no leídas al usuario
   */
  sendUnreadCountToUser(userId: string, count: number) {
    this.server.to(`user_${userId}`).emit('unread_count', { count });
  }
}
