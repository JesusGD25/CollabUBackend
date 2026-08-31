import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { MicroserviceHttpClient } from '@collab-u/shared';

import { Application } from './entities/application.entity';
import { ApplicationTimeline } from './entities/application-timeline.entity';
import { Interview } from './entities/interview.entity';
import { StudentDeliverable } from './entities/student-deliverable.entity';
import { DeliverableAttachment } from './entities/deliverable-attachment.entity';
import { ProjectDocument } from './entities/project-document.entity';
import { AcademicSubmission } from './entities/academic-submission.entity';
import { SubmissionHistory } from './entities/submission-history.entity';
import { ProjectAcademicRecord } from './entities/project-academic-record.entity';
import { DeliverableComment } from './entities/deliverable-comment.entity';
import { FinalDocumentRequirement } from './entities/final-document-requirement.entity';
import { SelectionDocumentRequest } from './entities/selection-document-request.entity';
import { ProjectDocumentRequirement } from './entities/project-document-requirement.entity';

import { ApplicationService } from './application.service';
import { ProjectAccessService } from './project-access.service';
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
      ProjectDocument,
      AcademicSubmission,
      SubmissionHistory,
      ProjectAcademicRecord,
      DeliverableComment,
      FinalDocumentRequirement,
      SelectionDocumentRequest,
      ProjectDocumentRequirement,
    ]),
    HttpModule,
  ],
  controllers: [ApplicationController, ApplicationInternalController],
  providers: [
    ApplicationService,
    ProjectAccessService,
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
