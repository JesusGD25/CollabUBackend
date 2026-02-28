import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationToken } from './entities/verification-token.entity';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthInternalController } from './internal/auth-internal.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, VerificationToken]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'collabu-jwt-super-secret-key-change-in-production-2025',
      signOptions: { expiresIn: '1h' },
    }),
    PassportModule,
  ],
  controllers: [AuthController, AuthInternalController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
