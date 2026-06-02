import { IsUUID, IsOptional, IsString, IsUrl, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ description: 'UUID del proyecto al que se postula' })
  @IsUUID('4')
  projectId: string;

  @ApiPropertyOptional({ description: 'Carta de presentación (mínimo 50 caracteres)', minLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(3000)
  coverLetter?: string;

  @ApiPropertyOptional({ description: 'URL del CV en Storage Service' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  resumeUrl?: string;

  @ApiPropertyOptional({ description: 'URL del portafolio' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  portfolioUrl?: string;
}
