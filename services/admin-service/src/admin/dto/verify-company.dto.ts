import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationAction } from '../entities/company-verification.entity';

class DocumentReviewedDto {
  @IsString()
  docName: string;

  @IsString()
  docUrl: string;

  @IsBoolean()
  verified: boolean;
}

export class VerifyCompanyDto {
  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiProperty({ enum: VerificationAction })
  @IsEnum(VerificationAction)
  action: VerificationAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentReviewedDto)
  documentsReviewed?: DocumentReviewedDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previousStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newStatus?: string;
}
