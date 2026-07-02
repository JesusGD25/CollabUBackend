import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, CurrentUser } from '@collab-u/shared';

import { NotificationService } from './notification.service';
import {
  MarkNotificationsReadDto,
  UpdateNotificationPreferencesDto,
  NotificationQueryDto,
  RegisterPushSubscriptionDto,
} from './dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getMyNotifications(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getUserNotifications(user.id, query);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationService
      .getUnreadCount(user.id)
      .then((count) => ({ count }));
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.notificationService.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(user.id, dto);
  }

  @Patch('read')
  @HttpCode(HttpStatus.OK)
  markAsRead(
    @CurrentUser() user: any,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    return this.notificationService.markManyAsRead(user.id, dto);
  }

  @Patch(':id/read')
  markOneAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.notificationService.deleteNotification(id, user.id);
  }

  @Post('push-subscriptions')
  registerPushSubscription(
    @CurrentUser() user: any,
    @Body() dto: RegisterPushSubscriptionDto,
  ) {
    return this.notificationService.registerPushSubscription(user.id, dto);
  }

  @Delete('push-subscriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePushSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.notificationService.removePushSubscription(user.id, id);
  }
}
