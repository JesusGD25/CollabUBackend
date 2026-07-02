import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateCertificationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  issuingOrganization?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión debe ser una fecha válida ISO 8601' })
  issueDate?: string;

  @IsOptional()
  @ValidateIf((o) => o.isPermanent !== true)
  @IsDateString({}, { message: 'La fecha de expiración debe ser una fecha válida ISO 8601' })
  expirationDate?: string;

  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  credentialId?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  @MaxLength(500)
  credentialUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsAssociated?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
