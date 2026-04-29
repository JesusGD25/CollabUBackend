import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MatchWeight } from './entities/match-weight.entity';
import { MatchResult } from './entities/match-result.entity';
import { MatchRecommendation } from './entities/match-recommendation.entity';
import { MatchFeedback } from './entities/match-feedback.entity';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { MatchingInternalController } from './matching-internal.controller';
import { MicroserviceHttpClient, EventPublisher } from '@collab-u/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchWeight, MatchResult, MatchRecommendation, MatchFeedback]),
    HttpModule,
  ],
  controllers: [MatchingController, MatchingInternalController],
  providers: [MatchingService, MicroserviceHttpClient, EventPublisher],
  exports: [MatchingService],
})
export class MatchingModule {}
