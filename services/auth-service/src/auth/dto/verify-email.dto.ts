import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'verification-token-uuid' })
  @IsString()
  @IsNotEmpty({ message: 'El token de verificación es requerido' })
  token: string;
}
