# shared/src/constants/

Constantes, enums y configuraciones compartidas.

## Archivos a crear

- **roles.enum.ts** — Enum `UserRole` con los valores: `STUDENT`, `COMPANY`, `FACULTY`, `ADMIN`. Usado por guards, decoradores y toda lógica de autorización.
- **event-types.ts** — Constantes con todas las routing keys de eventos RabbitMQ (ej. `auth.user.created`, `application.status.updated`, `project.published`, etc.). Organizadas por dominio, más de 30 routing keys.
- **error-codes.ts** — Códigos de error estandarizados del sistema con mensajes descriptivos (ej. `USER_NOT_FOUND`, `INVALID_CREDENTIALS`, `PROFILE_INCOMPLETE`).
