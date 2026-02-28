import { Expose, Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class AuthUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  role: UserRole;

  @Expose()
  isVerified: boolean;

  @Expose()
  isActive: boolean;
}

export class AuthResponseDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  @Expose()
  @Type(() => AuthUserDto)
  user: AuthUserDto;

  @Expose()
  expiresIn: number;
}

export class TokenPayloadDto {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
