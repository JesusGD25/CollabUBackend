import { PartialType } from '@nestjs/swagger';
import { CreateAcademicProgramDto } from './create-academic-program.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateAcademicProgramDto extends PartialType(CreateAcademicProgramDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
