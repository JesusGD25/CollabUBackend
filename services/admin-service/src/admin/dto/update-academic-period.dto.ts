import { PartialType } from '@nestjs/swagger';
import { CreateAcademicPeriodDto } from './create-academic-period.dto';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { PeriodStatus } from '../entities/academic-period.entity';

export class UpdateAcademicPeriodDto extends PartialType(CreateAcademicPeriodDto) {
  @IsOptional()
  @IsEnum(PeriodStatus)
  status?: PeriodStatus;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
