# User Service

**Puerto:** 3002
**Base de datos:** `user_db`

## Propósito

Gestiona los perfiles de usuario genéricos (comunes a todos los roles), configuraciones de cuenta y logs de actividad. Es el servicio central de identidad de perfil.

## Estructura Interna

```
user-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts       ← Conexión a user_db
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts      ← CRUD de perfil de usuario
    │   ├── users.service.ts         ← Lógica de negocio
    │   ├── dto/                     ← UpdateProfileDto, UserSettingsDto, etc.
    │   ├── entities/
    │   │   ├── user-profile.entity.ts   ← Nombre, apellido, avatar, bio, teléfono
    │   │   ├── user-settings.entity.ts  ← Preferencias de notificación, tema, idioma
    │   │   └── activity-log.entity.ts   ← Registro de actividad del usuario
    │   └── internal/
    │       └── users-internal.controller.ts ← Endpoints internos
    ├── events/
    │   └── user-events.subscriber.ts    ← Escucha auth.user.created → crea perfil
    └── health/
        └── health.controller.ts
```

## Eventos

- **Consume:** `auth.user.created` → Crea automáticamente un perfil de usuario vacío
- **Publica:** `user.profile.updated` → Cuando el usuario actualiza su perfil
