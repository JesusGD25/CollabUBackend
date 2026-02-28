import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'PasswordActual123!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;

  @ApiProperty({ example: 'NuevaPassword456!' })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La nueva contraseña no puede exceder 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_.])[A-Za-z\d@$!%*?&#+\-_.]{8,}$/,
    {
      message:
        'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  newPassword: string;
}
