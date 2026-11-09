import { GatewayAuthMiddleware } from './auth.middleware';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

// ─── Mock HttpService ────────────────────────────────────────────────

const mockHttpService = {
  post: jest.fn(),
  get: jest.fn(),
};

describe('GatewayAuthMiddleware', () => {
  let middleware: GatewayAuthMiddleware;

  beforeEach(() => {
    middleware = new GatewayAuthMiddleware(mockHttpService as any);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Helpers ────────────────────────────────────────────────────
  function createReq(overrides: any = {}): any {
    return {
      path: '/api/v1/users/profile',
      method: 'GET',
      headers: {},
      ...overrides,
    };
  }

  function createRes(): any {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  }

  const next = jest.fn();

  // ═══════════════════════════════════════════════════════════════════
  // RUTAS PÚBLICAS
  // ═══════════════════════════════════════════════════════════════════
  describe('rutas públicas', () => {
    it('debería permitir /health sin token', async () => {
      const req = createReq({ path: '/health' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('debería permitir /api/docs sin token', async () => {
      const req = createReq({ path: '/api/docs' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir /api/v1/auth/login sin token', async () => {
      const req = createReq({ path: '/api/v1/auth/login' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir /api/v1/auth/register sin token', async () => {
      const req = createReq({ path: '/api/v1/auth/register' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir /api/v1/auth/refresh sin token', async () => {
      const req = createReq({ path: '/api/v1/auth/refresh' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir /api/v1/auth/verify-email sin token', async () => {
      const req = createReq({ path: '/api/v1/auth/verify-email' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir /api/v1/auth/forgot-password sin token', async () => {
      const req = createReq({ path: '/api/v1/auth/forgot-password' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir /api/v1/auth/reset-password sin token', async () => {
      const req = createReq({ path: '/api/v1/auth/reset-password' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir /api/v1/auth/validate sin token', async () => {
      const req = createReq({ path: '/api/v1/auth/validate' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // RUTAS PÚBLICAS SOLO GET
  // ═══════════════════════════════════════════════════════════════════
  describe('rutas públicas solo GET', () => {
    it('debería permitir GET /api/v1/projects sin token', async () => {
      const req = createReq({ path: '/api/v1/projects', method: 'GET' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir GET /api/v1/projects/:uuid sin token', async () => {
      const req = createReq({
        path: '/api/v1/projects/a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        method: 'GET',
      });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('NO debería permitir POST /api/v1/projects sin token', async () => {
      const req = createReq({ path: '/api/v1/projects', method: 'POST' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('debería permitir GET /api/v1/evaluations/criteria sin token', async () => {
      const req = createReq({ path: '/api/v1/evaluations/criteria', method: 'GET' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debería permitir GET /api/v1/storage/files/:uuid/download sin token', async () => {
      const req = createReq({
        path: '/api/v1/storage/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download',
        method: 'GET',
      });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // RUTAS PROTEGIDAS - SIN TOKEN
  // ═══════════════════════════════════════════════════════════════════
  describe('rutas protegidas sin token', () => {
    it('debería retornar 401 si no hay header Authorization', async () => {
      const req = createReq({ path: '/api/v1/users/profile', method: 'GET' });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Token de autenticacion requerido',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el token no tiene prefijo Bearer', async () => {
      const req = createReq({
        path: '/api/v1/users/profile',
        headers: { authorization: 'Token abc123' },
      });
      const res = createRes();

      await middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // RUTAS PROTEGIDAS - CON TOKEN VÁLIDO
  // ═══════════════════════════════════════════════════════════════════
  describe('validación JWT exitosa', () => {
    it('debería inyectar headers x-user-* y llamar next()', async () => {
      const req = createReq({
        path: '/api/v1/users/profile',
        method: 'GET',
        headers: { authorization: 'Bearer valid-jwt-token' },
      });
      const res = createRes();

      const axiosResponse = {
        data: { id: 'user-uuid-1', email: 'test@udenar.edu.co', role: 'student' },
      } as AxiosResponse;
      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await middleware.use(req, res, next);

      expect(req.headers['x-user-id']).toBe('user-uuid-1');
      expect(req.headers['x-user-email']).toBe('test@udenar.edu.co');
      expect(req.headers['x-user-role']).toBe('student');
      expect(next).toHaveBeenCalled();
    });

    it('debería enviar el token al Auth Service para validación', async () => {
      const req = createReq({
        path: '/api/v1/users/profile',
        headers: { authorization: 'Bearer my-jwt' },
      });
      const res = createRes();

      const axiosResponse = {
        data: { id: '1', email: 'x', role: 'student' },
      } as AxiosResponse;
      mockHttpService.post.mockReturnValue(of(axiosResponse));

      await middleware.use(req, res, next);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/internal/auth/validate'),
        { token: 'my-jwt' },
        { timeout: 5000 },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // RUTAS PROTEGIDAS - CON TOKEN INVÁLIDO
  // ═══════════════════════════════════════════════════════════════════
  describe('validación JWT fallida', () => {
    it('debería retornar 401 si el Auth Service rechaza el token', async () => {
      const req = createReq({
        path: '/api/v1/users/profile',
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createRes();

      mockHttpService.post.mockReturnValue(throwError(() => new Error('Unauthorized')));

      await middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Token invalido o expirado',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ALCANCE DE ADMINISTRADOR (nivel / departamento)
  // ═══════════════════════════════════════════════════════════════════
  describe('alcance de administrador', () => {
    const adminToken = (data: Record<string, unknown>) => {
      mockHttpService.post.mockReturnValue(of({ data: { id: 'admin-1', email: 'a@udenar.edu.co', role: 'admin', ...data } } as AxiosResponse));
    };

    it('inyecta x-user-admin-level y x-user-department-id de un admin de departamento', async () => {
      const req = createReq({ headers: { authorization: 'Bearer t' } });
      adminToken({ adminLevel: 'department', departmentId: 'dept-sistemas' });

      await middleware.use(req, createRes(), next);

      expect(req.headers['x-user-admin-level']).toBe('department');
      expect(req.headers['x-user-department-id']).toBe('dept-sistemas');
      expect(next).toHaveBeenCalled();
    });

    it('un superadmin recibe nivel "super" y ningún departamento', async () => {
      const req = createReq({ headers: { authorization: 'Bearer t' } });
      adminToken({ adminLevel: 'super', departmentId: null });

      await middleware.use(req, createRes(), next);

      expect(req.headers['x-user-admin-level']).toBe('super');
      expect(req.headers['x-user-department-id']).toBeUndefined();
    });

    it('un cliente NO puede suplantar el nivel: las cabeceras que envía se descartan y se usan las del token', async () => {
      const req = createReq({
        headers: { authorization: 'Bearer t', 'x-user-admin-level': 'super', 'x-user-department-id': 'otro-departamento' },
      });
      adminToken({ adminLevel: 'department', departmentId: 'dept-civil' });

      await middleware.use(req, createRes(), next);

      expect(req.headers['x-user-admin-level']).toBe('department');
      expect(req.headers['x-user-department-id']).toBe('dept-civil');
    });

    it('un estudiante que envía x-user-admin-level: super NO lo conserva', async () => {
      const req = createReq({
        headers: { authorization: 'Bearer t', 'x-user-admin-level': 'super' },
      });
      mockHttpService.post.mockReturnValue(of({ data: { id: 's-1', email: 's@udenar.edu.co', role: 'student' } } as AxiosResponse));

      await middleware.use(req, createRes(), next);

      expect(req.headers['x-user-admin-level']).toBeUndefined();
      expect(req.headers['x-user-department-id']).toBeUndefined();
    });

    it('en una ruta pública sin token también se descartan las cabeceras de alcance enviadas por el cliente', async () => {
      const req = createReq({
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'x-user-admin-level': 'super', 'x-user-department-id': 'x' },
      });

      await middleware.use(req, createRes(), next);

      expect(req.headers['x-user-admin-level']).toBeUndefined();
      expect(req.headers['x-user-department-id']).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('con un token inválido en ruta pública tampoco sobrevive el alcance falsificado', async () => {
      const req = createReq({
        path: '/api/v1/projects',
        headers: { authorization: 'Bearer malo', 'x-user-admin-level': 'super' },
      });
      mockHttpService.post.mockReturnValue(throwError(() => new Error('401')));

      await middleware.use(req, createRes(), next);

      expect(req.headers['x-user-admin-level']).toBeUndefined();
    });
  });
});
