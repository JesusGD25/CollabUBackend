import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { EventPublisher, MicroserviceHttpClient, RabbitMQModule } from '@collab-u/shared';

import { ProjectMetrics } from './entities/project-metrics.entity';
import { StudentMetrics } from './entities/student-metrics.entity';
import { CompanyMetrics } from './entities/company-metrics.entity';
import { PlatformMetrics } from './entities/platform-metrics.entity';
import { SkillTrend } from './entities/skill-trend.entity';
import { Report } from './entities/report.entity';

import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEventsSubscriber } from './analytics-events.subscriber';
import { AnalyticsCronService } from './analytics-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectMetrics,
      StudentMetrics,
      CompanyMetrics,
      PlatformMetrics,
      SkillTrend,
      Report,
    ]),
    RabbitMQModule,
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    EventPublisher,
    AnalyticsEventsSubscriber,
    AnalyticsCronService,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => new MicroserviceHttpClient(httpService as any),
      inject: [HttpService],
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
