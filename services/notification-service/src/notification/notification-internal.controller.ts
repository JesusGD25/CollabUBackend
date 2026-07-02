import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto';

@ApiTags('internal-notifications')
@Controller('internal/notifications')
export class NotificationInternalController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.createNotification(dto);
  }

  @Get('user/:userId')
  getUserNotifications(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.notificationService.getUserNotifications(userId, {});
  }

  @Get('user/:userId/unread-count')
  getUnreadCount(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.notificationService
      .getUnreadCount(userId)
      .then((count) => ({ count }));
  }
}
