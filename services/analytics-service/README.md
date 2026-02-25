# Analytics Service

**Puerto:** 3012
**Base de datos:** `analytics_db`

## Propósito

Recopila métricas y genera reportes analíticos para el panel de administración. Consume eventos de dominio de múltiples servicios para construir dashboards con datos agregados (usuarios activos, aplicaciones por periodo, tasas de aceptación, skills más demandadas, etc.).

## Estructura Interna

```
analytics-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts           ← Conexión a analytics_db
    ├── analytics/
    │   ├── analytics.module.ts
    │   ├── analytics.controller.ts      ← Dashboards, reportes, métricas
    │   ├── analytics.service.ts
    │   ├── dto/
    │   ├── entities/
    │   │   ├── analytics-event.entity.ts   ← Eventos analíticos procesados
    │   │   ├── dashboard-metric.entity.ts  ← Métricas pre-calculadas para dashboards
    │   │   └── report.entity.ts            ← Reportes generados (exportables)
    │   └── internal/
    │       └── analytics-internal.controller.ts
    ├── events/
    │   └── analytics-events.subscriber.ts  ← Consume ~8 eventos de dominio
    └── health/
        └── health.controller.ts
```

## Eventos que Consume

- `auth.user.created` → Conteo de nuevos usuarios
- `application.created`, `application.status.updated` → Métricas de aplicaciones
- `project.published`, `project.closed` → Métricas de proyectos
- `evaluation.created` → Métricas de evaluaciones
- `matching.calculated` → Effectiveness del matching
- `application.completed` → Tasas de completitud
