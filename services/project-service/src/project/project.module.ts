import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';

import { Project } from './entities/project.entity';
import { ProjectRequirement } from './entities/project-requirement.entity';
import { ProjectDeliverable } from './entities/project-deliverable.entity';
import { ProjectTag } from './entities/project-tag.entity';
import { ProjectActivity } from './entities/project-activity.entity';

import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProjectInternalController } from './project-internal.controller';
import { MicroserviceHttpClient } from '@collab-u/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectRequirement,
      ProjectDeliverable,
      ProjectTag,
      ProjectActivity,
    ]),
    HttpModule,
  ],
  controllers: [ProjectController, ProjectInternalController],
  providers: [
    ProjectService,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => {
        return new MicroserviceHttpClient(httpService as any);
      },
      inject: [HttpService],
    },
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
