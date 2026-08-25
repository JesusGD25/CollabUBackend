import { IsUUID, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ description: 'UUID del proyecto al que se postula' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Carta de presentación (mínimo 50 caracteres)', minLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(3000)
  coverLetter?: string;

  @ApiPropertyOptional({ description: 'URL o ruta del CV en Storage Service', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resumeUrl?: string;

  @ApiPropertyOptional({ description: 'URL del portafolio', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  portfolioUrl?: string;
}
