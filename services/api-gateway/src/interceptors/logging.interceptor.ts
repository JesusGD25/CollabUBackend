import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class GatewayLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('APIGateway');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userId = request.headers['x-user-id'] || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.logger.log(
          `${method} ${url} - User: ${userId} - IP: ${ip} - ${responseTime}ms`,
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        this.logger.error(
          `${method} ${url} - User: ${userId} - IP: ${ip} - ${responseTime}ms - Error: ${error.message}`,
        );
        throw error;
      }),
    );
  }
}
