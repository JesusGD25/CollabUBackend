import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

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
    HttpModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
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
