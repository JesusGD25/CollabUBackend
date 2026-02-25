# Application Service

**Puerto:** 3006
**Base de datos:** `application_db`

## Propósito

Gestiona todo el ciclo de vida de las aplicaciones de estudiantes a proyectos: creación, cambios de estado, entrevistas, entregables y timeline. Es el servicio con más transiciones de estado (9 estados posibles).

## Estructura Interna

```
application-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts          ← Conexión a application_db
    ├── applications/
    │   ├── applications.module.ts
    │   ├── applications.controller.ts  ← Aplicar, cambiar estado, gestionar entregables
    │   ├── applications.service.ts
    │   ├── dto/                        ← CreateApplicationDto, UpdateStatusDto, etc.
    │   ├── entities/
    │   │   ├── application.entity.ts           ← Estudiante, proyecto, estado, match score, carta
    │   │   ├── application-timeline.entity.ts  ← Historial de cambios de estado
    │   │   ├── interview.entity.ts             ← Fecha, tipo, link, notas de entrevista
    │   │   └── deliverable.entity.ts           ← Entregables con fecha límite y calificación
    │   └── internal/
    │       └── applications-internal.controller.ts
    ├── events/
    │   └── application-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## Estados de una Aplicación

`pending` → `under_review` → `interview` → `accepted` → `in_progress` → `completed`
También: `rejected`, `cancelled`, `withdrawn`

## Eventos

- **Publica:** `application.created`, `application.status.updated`, `application.completed`
- **Consume:** `project.closed` → Rechaza automáticamente aplicaciones pendientes
