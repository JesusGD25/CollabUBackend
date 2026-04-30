import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
  ],
  controllers: [EvaluationController, EvaluationInternalController],
  providers: [EvaluationService, EventPublisher],
  exports: [EvaluationService],
})
export class EvaluationModule {}
