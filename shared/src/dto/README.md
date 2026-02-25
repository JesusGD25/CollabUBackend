# shared/src/dto/

DTOs (Data Transfer Objects) genéricos reutilizados por múltiples servicios.

## Archivos a crear

- **pagination.dto.ts** — `PaginationQueryDto` con campos `page`, `limit`, `sortBy`, `sortOrder`. Usado en todos los endpoints de listado.
- **api-response.dto.ts** — Envelope estándar de respuesta `{ success, data, message, timestamp }` que envuelve todas las respuestas de la API.
