import { GatewayLoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('GatewayLoggingInterceptor', () => {
  let interceptor: GatewayLoggingInterceptor;

  beforeEach(() => {
    interceptor = new GatewayLoggingInterceptor();
  });

  function createContext(overrides: any = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/v1/users/profile',
          ip: '127.0.0.1',
          headers: { 'x-user-id': 'user-uuid-1' },
          ...overrides,
        }),
      }),
      getClass: () => ({ name: 'TestController' }),
      getHandler: () => ({ name: 'testHandler' }),
    } as any;
  }

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('debería permitir que la respuesta pase sin modificarla', (done) => {
    const context = createContext();
    const handler: CallHandler = { handle: () => of({ data: 'ok' }) };

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        expect(value).toEqual({ data: 'ok' });
        done();
      },
    });
  });

  it('debería manejar el userId anonymous para usuarios no autenticados', (done) => {
    const context = createContext({ headers: {} });
    const handler: CallHandler = { handle: () => of('ok') };

    // No debería lanzar error
    interceptor.intercept(context, handler).subscribe({
      next: () => done(),
    });
  });

  it('debería propagar errores sin suprimirlos', (done) => {
    const context = createContext();
    const error = new Error('Internal Error');
    const handler: CallHandler = { handle: () => throwError(() => error) };

    interceptor.intercept(context, handler).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        done();
      },
    });
  });
});
