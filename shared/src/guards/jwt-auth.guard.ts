import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    if (!userId || !userRole) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    // Inyectar usuario en el request para uso downstream
    request.user = {
      id: userId,
      email: request.headers['x-user-email'],
      role: userRole,
    };

    return true;
  }
}
