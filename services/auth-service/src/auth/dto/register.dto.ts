import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'usuario@udenar.edu.co' })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'MiPassword123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_.])[A-Za-z\d@$!%*?&#+\-_.]{8,}$/,
    {
      message:
        'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
  @IsEnum(UserRole, {
    message: 'El rol debe ser: student, company, admin o faculty',
  })
  role: UserRole;
}
