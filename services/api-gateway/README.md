# API Gateway

**Puerto:** 3000
**Base de datos:** Ninguna (actúa como proxy)

## Propósito

Punto de entrada único para todas las peticiones del frontend. No contiene lógica de negocio; se encarga de:

- Rutear peticiones al microservicio correspondiente según la URL
- Validar tokens JWT antes de reenviar las peticiones
- Aplicar rate limiting para proteger los servicios
- Configurar CORS
- Proxy de WebSocket hacia notification-service y chat-service
- Health checks de todos los servicios

## Estructura Interna

```
api-gateway/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts                  ← Bootstrap de la aplicación
    ├── app.module.ts            ← Módulo raíz
    ├── config/
    │   ├── gateway.config.ts    ← Rutas y URLs de cada servicio
    │   ├── throttle.config.ts   ← Configuración de rate limiting
    │   └── websocket.config.ts  ← Proxy WebSocket
    ├── middleware/
    │   └── auth.middleware.ts   ← Valida JWT y adjunta usuario a la petición
    ├── interceptors/
    │   └── logging.interceptor.ts  ← Log de cada petición entrante
    └── health/
        └── health.controller.ts ← GET /health — estado de todos los servicios
```

## Rutas que Maneja

| Ruta | Servicio Destino |
|------|-----------------|
| `/api/auth/*` | auth-service:3001 |
| `/api/users/*` | user-service:3002 |
| `/api/students/*` | student-service:3003 |
| `/api/companies/*` | company-service:3004 |
| `/api/projects/*` | project-service:3005 |
| `/api/applications/*` | application-service:3006 |
| `/api/matching/*` | matching-service:3007 |
| `/api/evaluations/*` | evaluation-service:3008 |
| `/api/notifications/*` | notification-service:3009 |
| `/api/chat/*` | chat-service:3010 |
| `/api/admin/*` | admin-service:3011 |
| `/api/analytics/*` | analytics-service:3012 |
| `/api/storage/*` | storage-service:3013 |
