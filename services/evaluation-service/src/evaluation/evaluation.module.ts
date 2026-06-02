import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { MicroserviceHttpClient } from '@collab-u/shared';

import { Evaluation } from './entities/evaluation.entity';
import { EvaluationCriteria } from './entities/evaluation-criteria.entity';
import { EvaluationRating } from './entities/evaluation-rating.entity';
import { EvaluationTemplate } from './entities/evaluation-template.entity';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { EvaluationInternalController } from './evaluation-internal.controller';
import { EventPublisher } from '@collab-u/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Evaluation,
      EvaluationCriteria,
      EvaluationRating,
      EvaluationTemplate,
    ]),
    HttpModule,
  ],
  controllers: [EvaluationController, EvaluationInternalController],
  providers: [
    EvaluationService,
    EventPublisher,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => {
        return new MicroserviceHttpClient(httpService as any);
      },
      inject: [HttpService],
    },
  ],
  exports: [EvaluationService],
})
export class EvaluationModule {}
