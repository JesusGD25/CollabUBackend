# Admin Service

**Puerto:** 3011
**Base de datos:** `admin_db`

## Propósito

Funcionalidades administrativas del sistema: verificación de empresas, asignación de supervisores docentes, gestión de periodos académicos y configuración del sistema. Solo accesible por usuarios con rol `ADMIN`.

## Estructura Interna

```
admin-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts        ← Conexión a admin_db
    ├── admin/
    │   ├── admin.module.ts
    │   ├── admin.controller.ts       ← Verificaciones, supervisores, periodos, usuarios
    │   ├── admin.service.ts
    │   ├── dto/
    │   ├── entities/
    │   │   ├── company-verification.entity.ts  ← Solicitud de verificación con documentos
    │   │   ├── supervisor-assignment.entity.ts ← Asignación docente-estudiante-aplicación
    │   │   ├── academic-period.entity.ts       ← Periodos académicos (2026-A, 2026-B)
    │   │   └── system-configuration.entity.ts  ← Configuraciones generales del sistema
    │   └── internal/
    │       └── admin-internal.controller.ts
    ├── events/
    │   └── admin-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## Eventos

- **Consume:** `application.status.updated` (accepted) → Alerta para asignar supervisor
- **Publica:** `admin.company.verified`, `admin.company.rejected`, `admin.supervisor.assigned`, `admin.period.created`
