import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'abc123-refresh-token-uuid' })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es requerido' })
  refreshToken: string;
}
