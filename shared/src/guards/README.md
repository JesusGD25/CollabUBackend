# shared/src/guards/

Guards de NestJS compartidos para autenticación y autorización.

## Archivos a crear

- **jwt-auth.guard.ts** — Guard que valida el token JWT en las peticiones. Extrae el usuario del token y lo inyecta en `request.user`. Usado por todos los endpoints protegidos.
- **roles.guard.ts** — Guard que verifica que el usuario tenga uno de los roles permitidos (definidos con el decorador `@Roles`). Depende de `jwt-auth.guard` para tener el usuario disponible.
