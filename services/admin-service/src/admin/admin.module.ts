import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisher } from '@collab-u/shared';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import {
  AcademicPeriod,
  AcademicProgram,
  CompanyVerification,
  Supervisor,
  SupervisorAssignment,
  SystemSetting,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicPeriod,
      AcademicProgram,
      CompanyVerification,
      Supervisor,
      SupervisorAssignment,
      SystemSetting,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, EventPublisher],
  exports: [AdminService],
})
export class AdminModule {}
