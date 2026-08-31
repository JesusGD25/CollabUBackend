import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Application } from '../application/entities/application.entity';
import { ApplicationTimeline } from '../application/entities/application-timeline.entity';
import { Interview } from '../application/entities/interview.entity';
import { StudentDeliverable } from '../application/entities/student-deliverable.entity';
import { DeliverableAttachment } from '../application/entities/deliverable-attachment.entity';
import { ProjectDocument } from '../application/entities/project-document.entity';
import { AcademicSubmission } from '../application/entities/academic-submission.entity';
import { SubmissionHistory } from '../application/entities/submission-history.entity';
import { ProjectAcademicRecord } from '../application/entities/project-academic-record.entity';
import { DeliverableComment } from '../application/entities/deliverable-comment.entity';
import { FinalDocumentRequirement } from '../application/entities/final-document-requirement.entity';
import { SelectionDocumentRequest } from '../application/entities/selection-document-request.entity';
import { ProjectDocumentRequirement } from '../application/entities/project-document-requirement.entity';

export function databaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5435', 10),
    username: process.env.DB_USERNAME ?? 'collabu_admin',
    password: process.env.DB_PASSWORD ?? 'collabu_secret_2025',
    database: process.env.DB_NAME ?? 'application_db',
    entities: [
      Application, ApplicationTimeline, Interview, StudentDeliverable, DeliverableAttachment,
      ProjectDocument, AcademicSubmission, SubmissionHistory, ProjectAcademicRecord,
      DeliverableComment, FinalDocumentRequirement, SelectionDocumentRequest,
      ProjectDocumentRequirement,
    ],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
}
