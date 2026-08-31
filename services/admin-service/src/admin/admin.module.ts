import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { AdminController } from './admin.controller';
import { AdminInternalController } from './admin-internal.controller';
import { AdminService } from './admin.service';
import { AdminEventsSubscriber } from './admin-events.subscriber';

import {
  AcademicPeriod,
  AcademicProgram,
  CompanyVerification,
  Supervisor,
  SupervisorAssignment,
  SupervisorAssignmentHistory,
  SystemSetting,
  ProjectRejectionCategory,
  AcademicTemplate,
  DocumentRequirement,
  SkillCatalog,
  SkillProgramMapping,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicPeriod,
      AcademicProgram,
      CompanyVerification,
      Supervisor,
      SupervisorAssignment,
      SupervisorAssignmentHistory,
      SystemSetting,
      ProjectRejectionCategory,
      AcademicTemplate,
      DocumentRequirement,
      SkillCatalog,
      SkillProgramMapping,
    ]),
    HttpModule,
  ],
  controllers: [AdminController, AdminInternalController],
  providers: [
    AdminService,
    AdminEventsSubscriber,
    EventPublisher,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => new MicroserviceHttpClient(httpService as any),
      inject: [HttpService],
    },
  ],
  exports: [AdminService],
})
export class AdminModule {}
