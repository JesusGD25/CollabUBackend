import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupervisorRole } from '../entities/supervisor.entity';

export class CreateSupervisorDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiProperty({ enum: SupervisorRole })
  @IsEnum(SupervisorRole)
  role: SupervisorRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialization?: string;
}
