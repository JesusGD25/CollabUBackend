# shared/src/decorators/

Decoradores custom de NestJS reutilizados por todos los servicios.

## Archivos a crear

- **roles.decorator.ts** — Decorador `@Roles('admin', 'company', ...)` que asigna metadatos de roles permitidos a un endpoint. Trabaja en conjunto con `RolesGuard`.
- **current-user.decorator.ts** — Decorador de parámetro `@CurrentUser()` que extrae el usuario autenticado de `request.user` para inyectarlo directamente en el controlador.
