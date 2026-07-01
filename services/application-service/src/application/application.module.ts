import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { MicroserviceHttpClient } from '@collab-u/shared';

import { Application } from './entities/application.entity';
import { ApplicationTimeline } from './entities/application-timeline.entity';
import { Interview } from './entities/interview.entity';
import { StudentDeliverable } from './entities/student-deliverable.entity';
import { DeliverableAttachment } from './entities/deliverable-attachment.entity';

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
      DeliverableAttachment,
    ]),
    HttpModule,
  ],
  controllers: [ApplicationController, ApplicationInternalController],
  providers: [
    ApplicationService,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => {
        return new MicroserviceHttpClient(httpService as any);
      },
      inject: [HttpService],
    },
    EventPublisher,
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
