import { GATEWAY_ROUTES } from './gateway.config';
import { THROTTLE_CONFIG } from './throttle.config';

describe('Gateway Config', () => {
  describe('GATEWAY_ROUTES', () => {
    it('debería definir 13 servicios', () => {
      const services = Object.keys(GATEWAY_ROUTES);
      expect(services).toHaveLength(13);
    });

    it('debería incluir todos los servicios requeridos', () => {
      const expectedServices = [
        'auth', 'users', 'students', 'companies', 'projects',
        'applications', 'matching', 'evaluations', 'notifications',
        'chat', 'admin', 'analytics', 'storage',
      ];

      for (const svc of expectedServices) {
        expect(GATEWAY_ROUTES).toHaveProperty(svc);
      }
    });

    it('cada servicio debería tener target, pathPrefix, changeOrigin y requiresAuth', () => {
      for (const [name, route] of Object.entries(GATEWAY_ROUTES)) {
        expect(route).toHaveProperty('target');
        expect(route).toHaveProperty('pathPrefix');
        expect(route).toHaveProperty('changeOrigin');
        expect(route).toHaveProperty('requiresAuth');
        expect(typeof route.target).toBe('string');
        expect(route.pathPrefix).toMatch(/^\/api\/v1\//);
        expect(route.changeOrigin).toBe(true);
      }
    });

    it('auth-service debería estar en el puerto 3001', () => {
      expect(GATEWAY_ROUTES.auth.target).toContain('3001');
    });

    it('user-service debería estar en el puerto 3002', () => {
      expect(GATEWAY_ROUTES.users.target).toContain('3002');
    });

    it('auth no debería requerir autenticación', () => {
      expect(GATEWAY_ROUTES.auth.requiresAuth).toBe(false);
    });

    it('users debería requerir autenticación', () => {
      expect(GATEWAY_ROUTES.users.requiresAuth).toBe(true);
    });

    it('projects y evaluations no deberían requerir autenticación', () => {
      expect(GATEWAY_ROUTES.projects.requiresAuth).toBe(false);
      expect(GATEWAY_ROUTES.evaluations.requiresAuth).toBe(false);
    });
  });

  describe('THROTTLE_CONFIG', () => {
    it('debería tener límite global de 100 req/min', () => {
      expect(THROTTLE_CONFIG.global.ttl).toBe(60);
      expect(THROTTLE_CONFIG.global.limit).toBe(100);
    });

    it('debería tener límite de login de 5 intentos en 5 minutos', () => {
      expect(THROTTLE_CONFIG.auth.login.limit).toBe(5);
      expect(THROTTLE_CONFIG.auth.login.ttl).toBe(300);
    });

    it('debería tener límite de registro de 3 intentos en 1 hora', () => {
      expect(THROTTLE_CONFIG.auth.register.limit).toBe(3);
      expect(THROTTLE_CONFIG.auth.register.ttl).toBe(3600);
    });

    it('debería tener límite de uploads de 10/min', () => {
      expect(THROTTLE_CONFIG.upload.limit).toBe(10);
      expect(THROTTLE_CONFIG.upload.ttl).toBe(60);
    });
  });
});
