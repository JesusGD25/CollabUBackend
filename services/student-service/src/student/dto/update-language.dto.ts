import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LanguageProficiency } from '../entities/language.entity';

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  language?: string;

  @IsOptional()
  @IsEnum(LanguageProficiency, {
    message: 'El nivel debe ser: basic, intermediate, advanced o native',
  })
  proficiency?: LanguageProficiency;

  @IsOptional()
  @IsBoolean()
  isNative?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  certificationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  certificationScore?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
