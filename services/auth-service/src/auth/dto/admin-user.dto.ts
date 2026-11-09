import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminLevel, UserRole } from '@collab-u/shared';

const UUID_FORMAT = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreateAdminUserDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role: UserRole;

  @ApiPropertyOptional({ enum: AdminLevel, description: 'Obligatorio si role = admin' })
  @IsOptional()
  @IsIn(Object.values(AdminLevel), { message: 'El nivel debe ser "super" o "department"' })
  adminLevel?: AdminLevel;

  @ApiPropertyOptional({ description: 'Programa académico (departamento). Obligatorio si adminLevel = department' })
  @IsOptional()
  @IsString()
  @Matches(UUID_FORMAT, { message: 'departmentId debe ser un UUID' })
  departmentId?: string;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @ApiPropertyOptional({ enum: AdminLevel })
  @IsOptional()
  @IsIn(Object.values(AdminLevel), { message: 'El nivel debe ser "super" o "department"' })
  adminLevel?: AdminLevel;

  @ApiPropertyOptional({ description: 'null/ausente para superadmin' })
  @IsOptional()
  @IsString()
  @Matches(UUID_FORMAT, { message: 'departmentId debe ser un UUID' })
  departmentId?: string;
}
