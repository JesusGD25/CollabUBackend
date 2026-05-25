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
    private readonly notificationService: NotificationService
  ) {}

  afterInit(server: Server) {
    this.logger.log('Notification WebSocket Gateway inicializado');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      if (!token) {
        // En desarrollo permitimos conexión si no hay token por ahora
        this.logger.warn(`Conexión sin token en cliente: ${client.id}`);
      }

      // TODO: Validar token y obtener userId
      // const userId = await this.validateToken(token);
      // client.data.userId = userId;
      
      this.logger.log(`Cliente conectado a notificaciones: ${client.id}`);
    } catch (error) {
      this.logger.error(`Fallo de conexión en notificaciones: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado de notificaciones: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Unirse a una sala privada para este usuario
    client.join(`user_${data.userId}`);
    client.data.userId = data.userId;
    this.logger.log(`Cliente ${client.id} suscrito a notificaciones del usuario ${data.userId}`);
    return { event: 'subscribed', data: { userId: data.userId } };
  }

  /**
   * Método para ser llamado desde el servicio cuando llega una nueva notificación
   */
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }
}
