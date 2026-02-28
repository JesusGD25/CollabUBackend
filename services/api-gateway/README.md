# API Gateway

Punto de entrada principal para la plataforma **Collab-U** de la Universidad de Nariño. Gestiona el enrutamiento de peticiones a los microservicios downstream, validación de JWT, rate limiting y logging centralizado.

## Información General

| Campo | Valor |
|-------|-------|
| **Puerto** | `3000` |
| **Framework** | NestJS 11 |
| **Proxy** | http-proxy-middleware 3.x |
| **Rate Limiting** | @nestjs/throttler 6.x |
| **Swagger** | `http://localhost:3000/api/docs` |
| **Health Check** | `GET http://localhost:3000/health` |

## Arquitectura

```
src/
├── config/
│   ├── gateway.config.ts      # Rutas a todos los 13 microservicios
│   └── throttle.config.ts     # Configuración de rate limiting
├── middleware/
│   └── auth.middleware.ts      # Validación JWT → inyecta x-user-* headers
├── proxy/
│   └── proxy.middleware.ts     # Proxy reverso a servicios downstream
├── interceptors/
│   └── logging.interceptor.ts  # Logging centralizado de requests
├── health/
│   └── health.controller.ts    # Health check con verificación downstream
├── app.module.ts               # Módulo principal con cadena de middlewares
└── main.ts                     # Bootstrap, CORS, Swagger
```

## Pipeline de Middlewares

Cada petición a `api/v1/*` pasa por la siguiente cadena en orden:

```
Request → CORS → ValidationPipe → ThrottlerGuard → GatewayAuthMiddleware → ProxyMiddleware → Service
```

1. **CORS** — Permite `localhost:4200` (dev) y `collab-u.udenar.edu.co` (prod)
2. **ValidationPipe** — Valida DTOs cuando aplica
3. **ThrottlerGuard** — Limita a 100 requests/minuto globalmente
4. **GatewayAuthMiddleware** — Valida JWT y enriquece headers
5. **ProxyMiddleware** — Reenvía al servicio downstream correspondiente

## Enrutamiento de Servicios

El gateway enruta automáticamente las peticiones basándose en el prefijo de la URL:

| Prefijo | Servicio | Puerto | Requiere Auth |
|---------|----------|--------|---------------|
| `/api/v1/auth` | auth-service | 3001 | No |
| `/api/v1/users` | user-service | 3002 | Sí |
| `/api/v1/students` | student-service | 3003 | Sí |
| `/api/v1/companies` | company-service | 3004 | Sí |
| `/api/v1/projects` | project-service | 3005 | No |
| `/api/v1/applications` | application-service | 3006 | Sí |
| `/api/v1/matching` | matching-service | 3007 | Sí |
| `/api/v1/evaluations` | evaluation-service | 3008 | No |
| `/api/v1/notifications` | notification-service | 3009 | Sí |
| `/api/v1/chat` | chat-service | 3010 | Sí |
| `/api/v1/admin` | admin-service | 3011 | Sí |
| `/api/v1/analytics` | analytics-service | 3012 | Sí |
| `/api/v1/storage` | storage-service | 3013 | Sí |

Las URLs de los servicios son configurables por variables de entorno (ej: `AUTH_SERVICE_URL`).

## Autenticación (GatewayAuthMiddleware)

### Rutas Públicas (sin token)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/validate`
- `GET /health`
- `GET /api/docs*`

### Rutas Públicas solo con GET
- `GET /api/v1/projects` y `GET /api/v1/projects/:uuid`
- `GET /api/v1/evaluations/company/:uuid`
- `GET /api/v1/evaluations/student/:uuid`
- `GET /api/v1/evaluations/criteria`

### Flujo de Validación JWT
1. Extraer token del header `Authorization: Bearer <token>`
2. Si no hay token → `401 Token de autenticación requerido`
3. POST a `http://auth-service:3001/internal/auth/validate` con `{ token }`
4. Si válido → inyectar headers al request downstream:
   - `x-user-id` — UUID del usuario
   - `x-user-email` — Email del usuario
   - `x-user-role` — Rol (student, company, admin, faculty)
5. Si inválido → `401 Token inválido o expirado`
6. Timeout de validación: 5 segundos

## Proxy Reverso (ProxyMiddleware)

### Características
- Crea una instancia de `http-proxy-middleware` por cada servicio al inicializar
- `changeOrigin: true` para todos los servicios
- Propaga automáticamente los headers `x-user-*` al servicio downstream
- **Re-serializa el body** si ya fue parseado por Express (evita cuerpos vacíos en POST/PATCH)

### Manejo de Errores
Si un servicio downstream no está disponible:
```json
{
  "statusCode": 502,
  "message": "Servicio {nombre} no disponible",
  "error": "Bad Gateway",
  "timestamp": "2026-02-28T..."
}
```

## Rate Limiting

### Configuración Global
| Parámetro | Valor |
|-----------|-------|
| TTL | 60,000 ms (1 minuto) |
| Límite | 100 requests |

### Límites por Ruta (definidos, pendientes de implementar granular)
| Ruta | Límite | TTL |
|------|--------|-----|
| Login | 5 intentos | 5 minutos |
| Register | 3 intentos | 1 hora |
| Forgot Password | 3 intentos | 10 minutos |
| Uploads | 10 requests | 1 minuto |

## CORS

```typescript
{
  origin: ['http://localhost:4200', 'https://collab-u.udenar.edu.co'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'Content-Disposition'],
  maxAge: 3600
}
```

## Logging (GatewayLoggingInterceptor)

Cada request se registra con: método HTTP, URL, userId (o `anonymous`), IP, tiempo de respuesta en ms.

```
GET /health - User: anonymous - IP: ::1 - 28ms
POST /api/v1/auth/login - User: anonymous - IP: ::ffff:127.0.0.1 - 145ms
GET /api/v1/users/profile - User: ae9c2200-... - IP: ::1 - 67ms
```

Los errores se registran con nivel `ERROR`.

## Health Check

El endpoint `GET /health` verifica el gateway y servicios downstream activos:

```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2026-02-28T21:18:03.946Z",
  "downstream": {
    "auth": "ok",
    "users": "ok"
  }
}
```

Timeout por servicio: 3 segundos. Si un servicio no responde → `unavailable`.

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del gateway |
| `AUTH_SERVICE_URL` | `http://localhost:3001` | URL Auth Service |
| `USER_SERVICE_URL` | `http://localhost:3002` | URL User Service |
| `STUDENT_SERVICE_URL` | `http://localhost:3003` | URL Student Service |
| `COMPANY_SERVICE_URL` | `http://localhost:3004` | URL Company Service |
| `PROJECT_SERVICE_URL` | `http://localhost:3005` | URL Project Service |
| `APPLICATION_SERVICE_URL` | `http://localhost:3006` | URL Application Service |
| `MATCHING_SERVICE_URL` | `http://localhost:3007` | URL Matching Service |
| `EVALUATION_SERVICE_URL` | `http://localhost:3008` | URL Evaluation Service |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3009` | URL Notification Service |
| `CHAT_SERVICE_URL` | `http://localhost:3010` | URL Chat Service |
| `ADMIN_SERVICE_URL` | `http://localhost:3011` | URL Admin Service |
| `ANALYTICS_SERVICE_URL` | `http://localhost:3012` | URL Analytics Service |
| `STORAGE_SERVICE_URL` | `http://localhost:3013` | URL Storage Service |
| `NODE_ENV` | `development` | Entorno |

## Ejecución

```bash
# Desarrollo (hot-reload)
npm run start:dev

# Producción
npm run build
npm run start:prod

# Tests
npm run test              # Unit tests
npm run test:cov          # Con cobertura
npm run test:e2e          # E2E tests
```

## Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `http-proxy-middleware` | ^3.0.5 | Proxy reverso a microservicios |
| `@nestjs/axios` | ^4.0.1 | Cliente HTTP para validar tokens |
| `@nestjs/throttler` | ^6.5.0 | Rate limiting |
| `axios` | ^1.13.6 | HTTP client base |
| `@collab-u/shared` | local | Tipos compartidos |

## Notas Técnicas

### Body Re-serialization
NestJS parsea el body con `express.json()` antes de que el proxy pueda reenviarlo. El `ProxyMiddleware` detecta esto y re-serializa el body en el handler `proxyReq`:
```typescript
if (req.body && Object.keys(req.body).length > 0) {
  const bodyData = JSON.stringify(req.body);
  proxyReq.setHeader('Content-Type', 'application/json');
  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
}
```

### Sin Base de Datos
El API Gateway no tiene conexión a base de datos. Es un servicio stateless que solo enruta y valida.

### Sin RabbitMQ
No publica ni consume eventos. Toda la comunicación es HTTP síncrona.
