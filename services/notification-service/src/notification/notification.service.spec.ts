import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { NotificationService } from './notification.service';
import { Notification, NotificationType, NotificationChannel, NotificationPriority } from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { PushSubscription, DeviceType } from './entities/push-subscription.entity';
import { EmailQueue } from './entities/email-queue.entity';
import { NotificationGateway } from './notification.gateway';
import { MailerService } from './mailer.service';

const mockNotificationRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPreferencesRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockPushSubscriptionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockEmailQueueRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockEventPublisher = {
  publish: jest.fn(),
};

const mockNotificationGateway = {
  sendNotificationToUser: jest.fn(),
  sendUnreadCountToUser: jest.fn(),
};

const mockMailerService = {
  send: jest.fn().mockResolvedValue(true),
};

const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
};

const mockQueryBuilder = {
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  execute: jest.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: preferencias existentes con todo habilitado, salvo que un test sobreescriba el mock.
    mockPreferencesRepo.findOne.mockResolvedValue({
      userId: 'default-user',
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      applicationUpdates: true,
      interviewReminders: true,
      evaluationAlerts: true,
      matchRecommendations: true,
      projectUpdates: true,
      chatMessages: true,
      systemAnnouncements: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: getRepositoryToken(NotificationPreferences), useValue: mockPreferencesRepo },
        { provide: getRepositoryToken(PushSubscription), useValue: mockPushSubscriptionRepo },
        { provide: getRepositoryToken(EmailQueue), useValue: mockEmailQueueRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
        { provide: MailerService, useValue: mockMailerService },
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  // ──────────────────────────────────────────────────────────────────
  // createNotification
  // ──────────────────────────────────────────────────────────────────

  describe('createNotification', () => {
    it('should create and save notification, then publish event', async () => {
      const dto = {
        userId: 'user-1',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: 'Test Title',
        message: 'Test message',
      };

      const created = { id: 'notif-1', ...dto };
      mockNotificationRepo.create.mockReturnValue(created);
      mockNotificationRepo.save.mockResolvedValue(created);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.createNotification(dto);

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', type: NotificationType.SYSTEM_ANNOUNCEMENT }),
      );
      expect(mockNotificationRepo.save).toHaveBeenCalledWith(created);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'notification.created',
        expect.objectContaining({ notificationId: 'notif-1', userId: 'user-1' }),
        'notification-service',
      );
      expect(result).toEqual(created);
    });

    it('should create notification with optional fields', async () => {
      const dto = {
        userId: 'user-2',
        type: NotificationType.APPLICATION_RECEIVED,
        title: 'Nueva postulación',
        message: 'Mensaje',
        data: { projectId: 'p1' },
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.HIGH,
        actionUrl: '/projects/p1',
        groupKey: 'application-p1',
      };

      const created = { id: 'notif-2', ...dto };
      mockNotificationRepo.create.mockReturnValue(created);
      mockNotificationRepo.save.mockResolvedValue(created);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.createNotification(dto);

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.HIGH,
          actionUrl: '/projects/p1',
        }),
      );
      expect(result).toEqual(created);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getUserNotifications
  // ──────────────────────────────────────────────────────────────────

  describe('getUserNotifications', () => {
    it('should return paginated notifications for user', async () => {
      const notifs = [{ id: 'n1', userId: 'user-1' }];
      mockNotificationRepo.findAndCount.mockResolvedValue([notifs, 1]);

      const result = await service.getUserNotifications('user-1', { page: 1, limit: 20 });

      expect(mockNotificationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, skip: 0, take: 20 }),
      );
      expect(result).toEqual({ data: notifs, total: 1, page: 1, limit: 20 });
    });

    it('should filter by unreadOnly when specified', async () => {
      mockNotificationRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications('user-1', { unreadOnly: true });

      expect(mockNotificationRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isRead: false }) }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getUnreadCount
  // ──────────────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockNotificationRepo.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(mockNotificationRepo.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(result).toBe(5);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // markAsRead
  // ──────────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('should mark a single notification as read', async () => {
      const notification = { id: 'n1', userId: 'user-1', isRead: false, readAt: null };
      mockNotificationRepo.findOne.mockResolvedValue(notification);
      mockNotificationRepo.save.mockResolvedValue({ ...notification, isRead: true });

      const result = await service.markAsRead('n1', 'user-1');

      expect(mockNotificationRepo.save).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('n1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should not save if already read', async () => {
      const notification = { id: 'n1', userId: 'user-1', isRead: true, readAt: new Date() };
      mockNotificationRepo.findOne.mockResolvedValue(notification);

      await service.markAsRead('n1', 'user-1');

      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // markManyAsRead
  // ──────────────────────────────────────────────────────────────────

  describe('markManyAsRead', () => {
    it('should mark specific notification IDs as read', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 2 });
      mockNotificationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.markManyAsRead('user-1', {
        notificationIds: ['n1', 'n2'],
      });

      expect(result).toEqual({ updated: 2 });
    });

    it('should mark all unread notifications when no IDs provided', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 3 });
      mockNotificationRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.markManyAsRead('user-1', {});

      expect(result).toEqual({ updated: 3 });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // deleteNotification
  // ──────────────────────────────────────────────────────────────────

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notification = { id: 'n1', userId: 'user-1' };
      mockNotificationRepo.findOne.mockResolvedValue(notification);
      mockNotificationRepo.remove.mockResolvedValue(notification);

      await service.deleteNotification('n1', 'user-1');

      expect(mockNotificationRepo.remove).toHaveBeenCalledWith(notification);
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockNotificationRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteNotification('n1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getPreferences
  // ──────────────────────────────────────────────────────────────────

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const prefs = { id: 'pref-1', userId: 'user-1', emailEnabled: true };
      mockPreferencesRepo.findOne.mockResolvedValue(prefs);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual(prefs);
      expect(mockPreferencesRepo.save).not.toHaveBeenCalled();
    });

    it('should create default preferences if not found', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(null);
      const newPrefs = { id: 'pref-new', userId: 'user-1' };
      mockPreferencesRepo.create.mockReturnValue(newPrefs);
      mockPreferencesRepo.save.mockResolvedValue(newPrefs);

      const result = await service.getPreferences('user-1');

      expect(mockPreferencesRepo.create).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(mockPreferencesRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newPrefs);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // updatePreferences
  // ──────────────────────────────────────────────────────────────────

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      const prefs = { id: 'pref-1', userId: 'user-1', emailEnabled: true };
      mockPreferencesRepo.findOne.mockResolvedValue(prefs);
      mockPreferencesRepo.save.mockResolvedValue({ ...prefs, emailEnabled: false });

      const result = await service.updatePreferences('user-1', { emailEnabled: false });

      expect(mockPreferencesRepo.save).toHaveBeenCalled();
      expect(result.emailEnabled).toBe(false);
    });

    it('should create preferences if they do not exist and then update', async () => {
      mockPreferencesRepo.findOne.mockResolvedValue(null);
      const newPrefs = { userId: 'user-1', emailEnabled: true };
      mockPreferencesRepo.create.mockReturnValue(newPrefs);
      mockPreferencesRepo.save.mockResolvedValue({ ...newPrefs, pushEnabled: false });

      const result = await service.updatePreferences('user-1', { pushEnabled: false });

      expect(mockPreferencesRepo.create).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // registerPushSubscription
  // ──────────────────────────────────────────────────────────────────

  describe('registerPushSubscription', () => {
    it('should create new push subscription', async () => {
      const dto = { endpoint: 'https://fcm.example.com/token', deviceType: DeviceType.WEB };
      mockPushSubscriptionRepo.findOne.mockResolvedValue(null);
      const newSub = { id: 'sub-1', userId: 'user-1', ...dto, isActive: true };
      mockPushSubscriptionRepo.create.mockReturnValue(newSub);
      mockPushSubscriptionRepo.save.mockResolvedValue(newSub);

      const result = await service.registerPushSubscription('user-1', dto);

      expect(mockPushSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', endpoint: dto.endpoint, isActive: true }),
      );
      expect(result).toEqual(newSub);
    });

    it('should update existing subscription if endpoint already exists', async () => {
      const dto = { endpoint: 'https://fcm.example.com/token', deviceType: DeviceType.WEB };
      const existingSub = { id: 'sub-1', userId: 'user-1', endpoint: dto.endpoint, isActive: false };
      mockPushSubscriptionRepo.findOne.mockResolvedValue(existingSub);
      mockPushSubscriptionRepo.save.mockResolvedValue({ ...existingSub, isActive: true });

      const result = await service.registerPushSubscription('user-1', dto);

      expect(mockPushSubscriptionRepo.create).not.toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // removePushSubscription
  // ──────────────────────────────────────────────────────────────────

  describe('removePushSubscription', () => {
    it('should remove a push subscription', async () => {
      const sub = { id: 'sub-1', userId: 'user-1' };
      mockPushSubscriptionRepo.findOne.mockResolvedValue(sub);
      mockPushSubscriptionRepo.remove.mockResolvedValue(sub);

      await service.removePushSubscription('user-1', 'sub-1');

      expect(mockPushSubscriptionRepo.remove).toHaveBeenCalledWith(sub);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPushSubscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.removePushSubscription('user-1', 'sub-1')).rejects.toThrow(NotFoundException);
    });
  });
});
