# shared/src/http-client/

Cliente HTTP centralizado para comunicación síncrona entre microservicios.

## Archivos a crear

- **microservice-http-client.service.ts** — Servicio inyectable que encapsula las llamadas HTTP entre servicios. Provee métodos `get()`, `post()`, `put()`, `patch()`, `delete()` con:
  - URLs base configurables por servicio (ej. `http://auth-service:3001`)
  - Forward automático del token JWT del usuario actual
  - Timeout configurable
  - Integración con el Circuit Breaker
  - Logging de peticiones inter-servicio
