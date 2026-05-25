import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventPublisher } from '@collab-u/shared';

import {
  Notification,
  NotificationType,
} from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationGateway } from './notification.gateway';

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
    private readonly eventPublisher: EventPublisher,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway: NotificationGateway,
  ) {}

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

    // Enviar notificación por WebSocket en tiempo real
    this.notificationGateway.sendNotificationToUser(saved.userId, saved);

    return saved;
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
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type,
      title,
      message,
      data,
    });
  }
}
