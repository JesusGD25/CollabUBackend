# Auth Service

**Puerto:** 3001
**Base de datos:** `auth_db`

## Propósito

Gestiona toda la autenticación del sistema: registro, login, tokens JWT, verificación de email y recuperación de contraseña. No almacena datos de perfil (eso lo hace user-service).

## Estructura Interna

```
auth-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts       ← Conexión a auth_db
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts       ← Endpoints públicos: login, register, refresh, etc.
    │   ├── auth.service.ts          ← Lógica de autenticación
    │   ├── dto/                     ← LoginDto, RegisterDto, RefreshTokenDto, etc.
    │   ├── entities/
    │   │   ├── user-credential.entity.ts    ← Email, passwordHash, role, isVerified
    │   │   ├── refresh-token.entity.ts      ← Tokens de refresco
    │   │   └── verification-token.entity.ts ← Tokens de verificación y reset
    │   ├── guards/
    │   │   ├── jwt.strategy.ts      ← Estrategia Passport JWT
    │   │   └── local.strategy.ts    ← Estrategia Passport local (email+password)
    │   └── internal/
    │       └── auth-internal.controller.ts  ← Endpoints internos (service-to-service)
    └── health/
        └── health.controller.ts
```

## Eventos que Publica (RabbitMQ)

- `auth.user.created` — Cuando se registra un nuevo usuario
- `auth.user.verified` — Cuando el usuario verifica su email
- `auth.password.reset` — Cuando se solicita reset de contraseña
