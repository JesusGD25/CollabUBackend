# Analytics Service — Collab-U

Microservicio de métricas, tendencias y reportes de la plataforma Collab-U.

- **Puerto:** `3012`
- **Base de datos:** `analytics_db` (PostgreSQL)
- **Swagger:** `http://localhost:3012/api/docs`

---

## Responsabilidades

- Almacenar snapshots diarios de métricas por proyecto, estudiante, empresa y plataforma
- Analizar tendencias de demanda/oferta de skills (gap analysis)
- Generar reportes analíticos bajo demanda
- Exponer dashboard institucional para admins y faculty

---

## Estructura

```
src/
├── analytics/
│   ├── entities/
│   │   ├── project-metrics.entity.ts    # Métricas por proyecto
│   │   ├── student-metrics.entity.ts    # Métricas por estudiante
│   │   ├── company-metrics.entity.ts    # Métricas por empresa
│   │   ├── platform-metrics.entity.ts   # Snapshot diario global
│   │   ├── skill-trend.entity.ts        # Demanda vs oferta de skills
│   │   └── report.entity.ts             # Reportes generados (JSONB)
│   ├── dto/
│   │   ├── metrics-query.dto.ts         # Filtros: from, to, periodId, groupBy
│   │   └── generate-report.dto.ts       # Tipo y parámetros del reporte
│   ├── analytics.service.ts
│   ├── analytics.controller.ts
│   ├── analytics.module.ts
│   ├── analytics.service.spec.ts        # 36 tests
│   └── analytics.controller.spec.ts     # 10 tests
├── config/
│   └── database.config.ts
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

---

## Endpoints

Base: `api/v1/analytics`

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/dashboard` | ADMIN, FACULTY | Dashboard institucional |
| GET | `/platform` | ADMIN, FACULTY | Métricas históricas de la plataforma |
| GET | `/projects/:projectId` | ADMIN, FACULTY, COMPANY | Historial de métricas del proyecto |
| GET | `/projects/:projectId/summary` | ADMIN, FACULTY, COMPANY | Snapshot más reciente del proyecto |
| GET | `/students/:studentId` | ADMIN, FACULTY, STUDENT* | Historial de métricas del estudiante |
| GET | `/students/:studentId/summary` | ADMIN, FACULTY, STUDENT* | Snapshot más reciente del estudiante |
| GET | `/companies/:companyId` | ADMIN, FACULTY, COMPANY* | Historial de métricas de la empresa |
| GET | `/companies/:companyId/summary` | ADMIN, FACULTY, COMPANY* | Snapshot más reciente de la empresa |
| GET | `/skills/trends` | Todos | Tendencias de skills (demanda vs oferta) |
| GET | `/skills/top` | Todos | Top 10 skills más demandados |
| POST | `/reports` | ADMIN, FACULTY | Generar un reporte |
| GET | `/reports` | ADMIN, FACULTY | Listar reportes generados |
| GET | `/reports/:id` | ADMIN, FACULTY | Obtener reporte por ID |

> \* Estudiantes y empresas solo acceden a sus propias métricas (scoped automáticamente).

### Query params comunes (`MetricsQueryDto`)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `from` | ISO date | Fecha inicio del rango |
| `to` | ISO date | Fecha fin del rango |
| `periodId` | UUID | Filtrar por periodo académico |
| `groupBy` | `day\|week\|month` | Agrupación (referencial) |

---

## Tipos de reportes

| `reportType` | Descripción |
|-------------|-------------|
| `period_summary` | Resumen general del periodo: plataforma + top skills |
| `skill_gap_analysis` | Análisis de brecha demanda/oferta por skill |
| `matching_effectiveness` | Efectividad del matching (scores, tiempos) |
| `company_performance` | Rendimiento de empresas |
| `student_outcomes` | Resultados de estudiantes |
| `custom` | Reporte libre con parámetros arbitrarios |

---

## Eventos publicados

| Evento | Cuándo |
|--------|--------|
| `analytics.report.generated` | Al generar un reporte exitosamente |

Este servicio **no consume** eventos de RabbitMQ — las métricas se registran vía API interna.

---

## Ejecución

```bash
# Desarrollo con hot-reload
npm run start:dev

# Tests
npm run test

# Build
npm run build
```

---

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3012` | Puerto del servicio |
| `DATABASE_HOST` | `localhost` | Host de PostgreSQL |
| `DATABASE_PORT` | `5435` | Puerto externo de PostgreSQL |
| `DATABASE_USER` | `collabu_admin` | Usuario de BD |
| `DATABASE_PASSWORD` | `collabu_secret_2025` | Contraseña de BD |
| `DATABASE_NAME` | `analytics_db` | Base de datos |
| `RABBITMQ_URL` | `amqp://admin:admin@localhost:5672` | URL de RabbitMQ |
| `JWT_SECRET` | — | Secret para validar tokens JWT |

