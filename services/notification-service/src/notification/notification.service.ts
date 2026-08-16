import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import {
  Notification,
  NotificationType,
} from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { EmailQueue, EmailStatus } from './entities/email-queue.entity';
import { NotificationGateway } from './notification.gateway';
import { MailerService } from './mailer.service';

import {
  CreateNotificationDto,
  MarkNotificationsReadDto,
  UpdateNotificationPreferencesDto,
  NotificationQueryDto,
  RegisterPushSubscriptionDto,
} from './dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepo: Repository<NotificationPreferences>,
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepo: Repository<PushSubscription>,
    @InjectRepository(EmailQueue)
    private readonly emailQueueRepo: Repository<EmailQueue>,
    private readonly eventPublisher: EventPublisher,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
    private readonly mailerService: MailerService,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  /** Determina si la categoría del tipo de notificación está habilitada en preferencias, sin mirar el canal (in-app/email) */
  private isTypeCategoryEnabled(prefs: NotificationPreferences, type: NotificationType): boolean {
    switch (type) {
      case NotificationType.APPLICATION_RECEIVED:
      case NotificationType.APPLICATION_STATUS_CHANGED:
      case NotificationType.APPLICATION_ACCEPTED:
      case NotificationType.APPLICATION_REJECTED:
        return prefs.applicationUpdates;

      case NotificationType.INTERVIEW_SCHEDULED:
      case NotificationType.INTERVIEW_REMINDER:
        return prefs.interviewReminders;

      case NotificationType.EVALUATION_PENDING:
      case NotificationType.EVALUATION_COMPLETED:
      case NotificationType.DELIVERABLE_FEEDBACK:
        return prefs.evaluationAlerts;

      case NotificationType.MATCH_RECOMMENDATION:
        return prefs.matchRecommendations;

      case NotificationType.PROJECT_NEW:
      case NotificationType.PROJECT_DEADLINE_REMINDER:
      case NotificationType.PROJECT_STATUS_CHANGED:
      case NotificationType.COMPANY_VERIFIED:
      case NotificationType.PROJECT_SUBMITTED_FOR_REVIEW:
      case NotificationType.PROJECT_APPROVED:
      case NotificationType.PROJECT_REJECTED:
      case NotificationType.PROJECT_NEEDS_CHANGES:
      case NotificationType.SUPERVISOR_ASSIGNED:
      case NotificationType.SUPERVISOR_ACCEPTED:
      case NotificationType.SUPERVISOR_DECLINED:
      case NotificationType.SUPERVISOR_REPLACED:
      case NotificationType.ANTEPROYECTO_SUBMITTED:
      case NotificationType.ANTEPROYECTO_CORRECTION_REQUESTED:
      case NotificationType.ANTEPROYECTO_APPROVED:
      case NotificationType.ANTEPROYECTO_REJECTED:
      case NotificationType.AGREEMENT_UPLOADED:
      case NotificationType.FINALIZATION_STARTED:
      case NotificationType.PROGRESS_NEAR_COMPLETION:
      case NotificationType.ACADEMIC_COMPLETED:
      case NotificationType.DEADLINE_EXTENDED:
        return prefs.projectUpdates;

      case NotificationType.MESSAGE_RECEIVED:
        return prefs.chatMessages;

      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return prefs.systemAnnouncements;

      default:
        return true; // Enviar por defecto si no es un tipo mapeado
    }
  }

  private shouldSendWebSocketNotification(prefs: NotificationPreferences, type: NotificationType): boolean {
    return prefs.inAppEnabled && this.isTypeCategoryEnabled(prefs, type);
  }

  private shouldSendEmail(prefs: NotificationPreferences, type: NotificationType): boolean {
    return prefs.emailEnabled && this.isTypeCategoryEnabled(prefs, type);
  }

  // ──────────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ──────────────────────────────────────────────────────────────────

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      channel: dto.channel,
      priority: dto.priority,
      actionUrl: dto.actionUrl,
      groupKey: dto.groupKey,
    });

    const saved = await this.notificationRepo.save(notification);

    await this.eventPublisher.publish(
      'notification.created',
      { notificationId: saved.id, userId: saved.userId, type: saved.type },
      'notification-service',
    );

    // Obtener preferencias del usuario y verificar si habilitó notificaciones en la app
    const prefs = await this.getPreferences(saved.userId);
    if (this.shouldSendWebSocketNotification(prefs, saved.type)) {
      // Enviar notificación por WebSocket en tiempo real
      this.notificationGateway.sendNotificationToUser(saved.userId, saved);
    }

    // Emitir conteo de no leídas en tiempo real al usuario
    const unreadCount = await this.getUnreadCount(saved.userId);
    this.notificationGateway.sendUnreadCountToUser(saved.userId, unreadCount);

    // Enviar por email si el usuario lo tiene habilitado para esta categoría (best-effort, no bloquea)
    if (this.shouldSendEmail(prefs, saved.type) || dto.forceEmail) {
      this.sendEmailForNotification(saved).catch((err) =>
        this.logger.error(`Error en envío de email para notificación ${saved.id}: ${err.message}`, err.stack),
      );
    }

    return saved;
  }

  /** Resuelve el email del usuario (vía Auth Service) y envía la notificación por correo. Registra el intento en email_queue. */
  private async sendEmailForNotification(notification: Notification): Promise<void> {
    let toEmail: string | null = null;
    try {
      const user = await this.httpClient.get<{ email: string }>(
        'auth',
        `/internal/auth/users/${notification.userId}`,
      );
      toEmail = user?.email ?? null;
    } catch (err: any) {
      this.logger.warn(`No se pudo obtener email del usuario ${notification.userId}: ${err.message}`);
    }

    if (!toEmail) {
      return;
    }

    const queueEntry = this.emailQueueRepo.create({
      notificationId: notification.id,
      toEmail,
      subject: notification.title,
      htmlContent: `<p>${notification.message}</p>`,
      textContent: notification.message,
      status: EmailStatus.SENDING,
      attempts: 1,
      lastAttemptAt: new Date(),
    });
    const saved = await this.emailQueueRepo.save(queueEntry);

    const sent = await this.mailerService.send({
      to: toEmail,
      subject: notification.title,
      html: `<p>${notification.message}</p>`,
      text: notification.message,
    });

    saved.status = sent ? EmailStatus.SENT : EmailStatus.FAILED;
    if (sent) {
      saved.sentAt = new Date();
    } else {
      saved.errorMessage = 'Fallo al enviar vía SMTP';
    }
    await this.emailQueueRepo.save(saved);
  }

  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<PaginatedResponse<Notification>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: FindOptionsWhere<Notification> = { userId };

    if (query.type) {
      where.type = query.type;
    }
    if (query.unreadOnly) {
      where.isRead = false;
    }

    const [data, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);

      // Emitir conteo actualizado
      const unreadCount = await this.getUnreadCount(userId);
      this.notificationGateway.sendUnreadCountToUser(userId, unreadCount);
    }

    return notification;
  }

  async markManyAsRead(
    userId: string,
    dto: MarkNotificationsReadDto,
  ): Promise<{ updated: number }> {
    let updated = 0;

    if (dto.notificationIds && dto.notificationIds.length > 0) {
      const result = await this.notificationRepo
        .createQueryBuilder()
        .update(Notification)
        .set({ isRead: true, readAt: new Date() })
        .where('user_id = :userId', { userId })
        .andWhere('id IN (:...ids)', { ids: dto.notificationIds })
        .andWhere('is_read = :isRead', { isRead: false })
        .execute();
      updated = result.affected ?? 0;
    } else {
      const result = await this.notificationRepo
        .createQueryBuilder()
        .update(Notification)
        .set({ isRead: true, readAt: new Date() })
        .where('user_id = :userId', { userId })
        .andWhere('is_read = :isRead', { isRead: false })
        .execute();
      updated = result.affected ?? 0;
    }

    if (updated > 0) {
      // Emitir conteo actualizado
      const unreadCount = await this.getUnreadCount(userId);
      this.notificationGateway.sendUnreadCountToUser(userId, unreadCount);
    }

    return { updated };
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepo.remove(notification);
  }

  // ──────────────────────────────────────────────────────────────────
  // PREFERENCES
  // ──────────────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = await this.preferencesRepo.findOne({ where: { userId } });

    if (!prefs) {
      prefs = this.preferencesRepo.create({ userId });
      prefs = await this.preferencesRepo.save(prefs);
    }

    return prefs;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    let prefs = await this.preferencesRepo.findOne({ where: { userId } });

    if (!prefs) {
      prefs = this.preferencesRepo.create({ userId });
    }

    Object.assign(prefs, dto);
    return this.preferencesRepo.save(prefs);
  }

  // ──────────────────────────────────────────────────────────────────
  // PUSH SUBSCRIPTIONS
  // ──────────────────────────────────────────────────────────────────

  async registerPushSubscription(
    userId: string,
    dto: RegisterPushSubscriptionDto,
  ): Promise<PushSubscription> {
    let sub = await this.pushSubscriptionRepo.findOne({
      where: { userId, endpoint: dto.endpoint },
    });

    if (sub) {
      Object.assign(sub, { ...dto, isActive: true });
      return this.pushSubscriptionRepo.save(sub);
    }

    sub = this.pushSubscriptionRepo.create({ userId, ...dto, isActive: true });
    return this.pushSubscriptionRepo.save(sub);
  }

  async removePushSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<void> {
    const sub = await this.pushSubscriptionRepo.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!sub) {
      throw new NotFoundException('Push subscription not found');
    }

    await this.pushSubscriptionRepo.remove(sub);
  }

  // ──────────────────────────────────────────────────────────────────
  // INTERNAL (used by event subscriber)
  // ──────────────────────────────────────────────────────────────────

  async createSystemNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    forceEmail?: boolean,
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type,
      title,
      message,
      data,
      forceEmail,
    });
  }
}
