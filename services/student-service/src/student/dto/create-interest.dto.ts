import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInterestDto {
  @IsString()
  @IsNotEmpty({ message: 'El área de interés es requerida' })
  @MaxLength(100)
  area: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subArea?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
