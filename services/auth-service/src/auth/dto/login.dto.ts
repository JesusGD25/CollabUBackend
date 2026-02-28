import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'usuario@udenar.edu.co' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'MiPassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;
}
