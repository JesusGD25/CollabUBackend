import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard, RolesGuard } from '@collab-u/shared';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationType } from './entities/notification.entity';

const mockNotificationService = {
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
  markManyAsRead: jest.fn(),
  markAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  registerPushSubscription: jest.fn(),
  removePushSubscription: jest.fn(),
};

describe('NotificationController', () => {
  let controller: NotificationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  describe('getMyNotifications', () => {
    it('should return paginated notifications for user', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20 };
      mockNotificationService.getUserNotifications.mockResolvedValue(paginated);

      const result = await controller.getMyNotifications({ id: 'user-1' }, {});

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user-1', {});
      expect(result).toEqual(paginated);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count wrapped in object', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(3);

      const result = await controller.getUnreadCount({ id: 'user-1' });

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const prefs = { userId: 'user-1', emailEnabled: true };
      mockNotificationService.getPreferences.mockResolvedValue(prefs);

      const result = await controller.getPreferences({ id: 'user-1' });

      expect(mockNotificationService.getPreferences).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(prefs);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences and return updated', async () => {
      const dto = { emailEnabled: false };
      const updated = { userId: 'user-1', emailEnabled: false };
      mockNotificationService.updatePreferences.mockResolvedValue(updated);

      const result = await controller.updatePreferences({ id: 'user-1' }, dto);

      expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(updated);
    });
  });

  describe('markAsRead (bulk)', () => {
    it('should delegate to markManyAsRead and return result', async () => {
      const dto = { notificationIds: ['n1', 'n2'] };
      mockNotificationService.markManyAsRead.mockResolvedValue({ updated: 2 });

      const result = await controller.markAsRead({ id: 'user-1' }, dto);

      expect(mockNotificationService.markManyAsRead).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ updated: 2 });
    });
  });

  describe('markOneAsRead', () => {
    it('should mark single notification as read', async () => {
      const notification = { id: 'n1', isRead: true };
      mockNotificationService.markAsRead.mockResolvedValue(notification);

      const result = await controller.markOneAsRead('n1', { id: 'user-1' });

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('n1', 'user-1');
      expect(result).toEqual(notification);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockNotificationService.deleteNotification.mockResolvedValue(undefined);

      await controller.deleteNotification('n1', { id: 'user-1' });

      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith('n1', 'user-1');
    });
  });

  describe('registerPushSubscription', () => {
    it('should register a push subscription', async () => {
      const dto = { endpoint: 'https://fcm.example.com/token' };
      const sub = { id: 'sub-1', userId: 'user-1', endpoint: dto.endpoint };
      mockNotificationService.registerPushSubscription.mockResolvedValue(sub);

      const result = await controller.registerPushSubscription({ id: 'user-1' }, dto);

      expect(mockNotificationService.registerPushSubscription).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(sub);
    });
  });

  describe('removePushSubscription', () => {
    it('should remove a push subscription', async () => {
      mockNotificationService.removePushSubscription.mockResolvedValue(undefined);

      await controller.removePushSubscription('sub-1', { id: 'user-1' });

      expect(mockNotificationService.removePushSubscription).toHaveBeenCalledWith('user-1', 'sub-1');
    });
  });
});
