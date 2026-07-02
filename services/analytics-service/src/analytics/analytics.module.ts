import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisher, RabbitMQModule } from '@collab-u/shared';

import { ProjectMetrics } from './entities/project-metrics.entity';
import { StudentMetrics } from './entities/student-metrics.entity';
import { CompanyMetrics } from './entities/company-metrics.entity';
import { PlatformMetrics } from './entities/platform-metrics.entity';
import { SkillTrend } from './entities/skill-trend.entity';
import { Report } from './entities/report.entity';

import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

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
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, EventPublisher],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
