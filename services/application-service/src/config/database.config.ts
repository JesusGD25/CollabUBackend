import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Application } from '../application/entities/application.entity';
import { ApplicationTimeline } from '../application/entities/application-timeline.entity';
import { Interview } from '../application/entities/interview.entity';
import { StudentDeliverable } from '../application/entities/student-deliverable.entity';
import { DeliverableAttachment } from '../application/entities/deliverable-attachment.entity';

export function databaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5435', 10),
    username: process.env.DB_USERNAME ?? 'collabu_admin',
    password: process.env.DB_PASSWORD ?? 'collabu_secret_2025',
    database: process.env.DB_NAME ?? 'application_db',
    entities: [Application, ApplicationTimeline, Interview, StudentDeliverable, DeliverableAttachment],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
}
