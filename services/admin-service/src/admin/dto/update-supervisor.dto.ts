import { IsOptional, IsString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { SupervisorRole } from '../entities/supervisor.entity';

export class UpdateSupervisorDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsEnum(SupervisorRole)
  role?: SupervisorRole;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialization?: string;
}