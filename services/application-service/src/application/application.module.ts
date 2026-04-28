import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MicroserviceHttpClient } from '@collab-u/shared';

import { Application } from './entities/application.entity';
import { ApplicationTimeline } from './entities/application-timeline.entity';
import { Interview } from './entities/interview.entity';
import { StudentDeliverable } from './entities/student-deliverable.entity';

import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { ApplicationInternalController } from './application-internal.controller';
import { EventPublisher } from '@collab-u/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      ApplicationTimeline,
      Interview,
      StudentDeliverable,
    ]),
    HttpModule,
  ],
  controllers: [ApplicationController, ApplicationInternalController],
  providers: [ApplicationService, MicroserviceHttpClient, EventPublisher],
  exports: [ApplicationService],
})
export class ApplicationModule {}
