import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserProfile } from './entities/user-profile.entity';
import { UserSettings } from './entities/user-settings.entity';
import { ActivityLog } from './entities/activity-log.entity';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersInternalController } from './internal/users-internal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, UserSettings, ActivityLog])],
  controllers: [UsersController, UsersInternalController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
