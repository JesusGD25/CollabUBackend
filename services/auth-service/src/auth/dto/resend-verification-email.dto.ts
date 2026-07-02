import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationEmailDto {
  @ApiProperty({ example: 'usuario@udenar.edu.co' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @MaxLength(255)
  email: string;
}