# Analytics Service — Collab-U

Microservicio de métricas, tendencias y reportes de la plataforma Collab-U.

- **Puerto:** `3012`
- **Base de datos:** `analytics_db` (PostgreSQL)
- **Swagger:** `http://localhost:3012/api/docs`

---

## Responsabilidades

- Mecanismo de actualización **híbrido** (ver `PLANNING_ANALYTICS_SERVICE.md` §1.4 en la raíz del repo, decisión congelada tras medir volumen real, no asumida):
  - Campos **acumulativos/de período** (totales, nuevos del período) se calculan **bajo demanda** en cada request, llamando a endpoints internos agregados de los servicios fuente — sin persistir nada, mismo patrón que `/academic-kpis`.
  - Campos **puntuales sobre estado no historizado** (`active_projects`, `avg_match_score`, `skill_trends`) se calculan una vez al día vía cron (`AnalyticsCronService`, 1am) y se persisten en `platform_metrics`/`skill_trends`.
- Backfill histórico bajo demanda (`POST /aggregate/run-historical`) para reconstruir series temporales de campos acumulativos sobre fechas pasadas (usado por el seed histórico, ver `Backend/scripts/generate-seed-analytics-historical.mjs`).
- Analizar tendencias de demanda/oferta de skills (gap analysis)
- Generar reportes analíticos bajo demanda (9 tipos, ver abajo)
- Exponer dashboard institucional para ADMIN y FACULTY

---

## Estructura

```
src/
├── analytics/
│   ├── entities/
│   │   ├── project-metrics.entity.ts    # Métricas por proyecto
│   │   ├── student-metrics.entity.ts    # Métricas por estudiante
│   │   ├── company-metrics.entity.ts    # Métricas por empresa
│   │   ├── platform-metrics.entity.ts   # Snapshot diario global (puntual, vía cron)
│   │   ├── skill-trend.entity.ts        # Demanda vs oferta de skills (puntual, vía cron)
│   │   └── report.entity.ts             # Reportes generados (JSONB)
│   ├── dto/
│   │   ├── metrics-query.dto.ts         # Filtros: from, to, periodId, groupBy
│   │   └── generate-report.dto.ts       # Tipo y parámetros del reporte
│   ├── analytics.service.ts             # Agregación bajo demanda + backfill histórico + reportes
│   ├── analytics-cron.service.ts        # Cron diario (1am) para campos puntuales
│   ├── analytics-events.subscriber.ts   # Consumidor RabbitMQ (ver "Eventos" abajo)
│   ├── analytics.controller.ts
│   ├── analytics.module.ts
│   ├── analytics.service.spec.ts        # 62 tests
│   └── analytics.controller.spec.ts     # 16 tests
├── config/
│   ├── database.config.ts               # Config runtime (Nest)
│   └── data-source.ts                   # Config CLI de TypeORM (migraciones)
├── migrations/                          # Migraciones reales (ver nota sobre `synchronize` abajo)
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
| GET | `/academic-kpis` | ADMIN, FACULTY | KPIs académicos — **100% bajo demanda**, agrega en caliente contra admin-service y application-service, sin persistir nada |
| POST | `/aggregate/run` | ADMIN | Fuerza la agregación diaria (campos puntuales) fuera del horario del cron |
| POST | `/aggregate/run-historical` | ADMIN | Backfill de `platform_metrics` para un conjunto de fechas históricas (campos acumulativos únicamente — ver limitación en el código) |
| GET | `/platform` | ADMIN, FACULTY | Métricas históricas de la plataforma |
| GET | `/projects/:projectId` | ADMIN, FACULTY, COMPANY | Historial de métricas del proyecto |
| GET | `/projects/:projectId/summary` | ADMIN, FACULTY, COMPANY | Resumen "ahora mismo" del proyecto — bajo demanda |
| GET | `/students/:studentId` | ADMIN, FACULTY, STUDENT* | Historial de métricas del estudiante |
| GET | `/students/:studentId/summary` | ADMIN, FACULTY, STUDENT* | Resumen "ahora mismo" del estudiante — bajo demanda |
| GET | `/companies/:companyId` | ADMIN, FACULTY, COMPANY* | Historial de métricas de la empresa |
| GET | `/companies/:companyId/summary` | ADMIN, FACULTY, COMPANY* | Resumen "ahora mismo" de la empresa — bajo demanda |
| GET | `/skills/trends` | Todos | Tendencias de skills (demanda vs oferta) — puntual, vía cron |
| GET | `/skills/top` | Todos | Top 10 skills más demandados — puntual, vía cron |
| POST | `/reports` | ADMIN, FACULTY | Generar un reporte |
| GET | `/reports` | ADMIN, FACULTY | Listar reportes generados |
| GET | `/reports/:id` | ADMIN, FACULTY | Obtener reporte por ID |

> \* Estudiantes y empresas solo acceden a sus propias métricas (scoped automáticamente).

Los endpoints `/summary` y `/academic-kpis` nunca dependen de que el cron ya haya corrido — calculan en vivo llamando a endpoints internos agregados de application-service, project-service, student-service, company-service, matching-service y evaluation-service (patrón documentado en `PLANNING_ANALYTICS_SERVICE.md` §1.5).

### Query params comunes (`MetricsQueryDto`)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `from` | ISO date | Fecha inicio del rango |
| `to` | ISO date | Fecha fin del rango |
| `periodId` | UUID | Filtrar por periodo académico |
| `groupBy` | `day\|week\|month` | Aceptado por el DTO pero **no usado** por ninguna query todavía (referencial) |

---

## Tipos de reportes

| `reportType` | Descripción | Fuente |
|-------------|-------------|--------|
| `period_summary` | Resumen general del periodo: plataforma + top skills | `platform_metrics`/`skill_trends` (puntual, vía cron) |
| `skill_gap_analysis` | Análisis de brecha demanda/oferta por skill | `skill_trends` |
| `matching_effectiveness` | Efectividad del matching (scores, tiempos) | `platform_metrics` |
| `academic_process_summary` | Resumen del proceso académico | admin-service + application-service, bajo demanda |
| `supervisor_workload` | Carga de docentes/asesores | admin-service, bajo demanda |
| `project_completion_rates` | Tasas de completitud de expedientes académicos | application-service, bajo demanda |
| `company_performance` | Rendimiento de empresas (alcance: agregado de plataforma, no ranking por empresa individual) | company-service + project-service + evaluation-service, bajo demanda |
| `student_outcomes` | Resultados de estudiantes (tasa de colocación, evaluación recibida) | application-service + evaluation-service, bajo demanda |
| `custom` | Reporte libre con parámetros arbitrarios | — |

Cada reporte persiste `status: 'completed'` o `'failed'` (si `buildReportData` lanza una excepción, se guarda el reporte con el error en `data.error` en vez de devolver un 500 silencioso).

---

## Eventos

**Consumidor** (`analytics-events.subscriber.ts`) — suscrito a 3 eventos reales (`academic.completed`, `admin.supervisor.declined`, `academic.anteproyecto.expired`). Los 3 handlers **solo registran en logs**, no escriben métricas — es un punto de integración cableado pero no conectado a la lógica de agregación; no se usa como mecanismo de actualización (decisión documentada: al volumen medido de la plataforma, eventos no se justifican para v1, ver `PLANNING_ANALYTICS_SERVICE.md` §1.4).

**Productor** — `analytics.report.generated`, publicado al generar un reporte exitosamente (no se publica si el reporte queda en `status: 'failed'`).

---

## Migraciones

Existe `src/config/data-source.ts` + `src/migrations/` (migración inicial escrita a mano, reflejando el schema que `synchronize: true` genera hoy en desarrollo). **`synchronize: true` sigue activo en `database.config.ts`** — el flip a `false` está pendiente de verificar la migración contra una base de datos limpia (no se verificó en la sesión que la introdujo, por no tener Docker corriendo en ese momento). Comandos disponibles:

```bash
npm run migration:generate -- src/migrations/NombreMigracion
npm run migration:run
npm run migration:revert
```

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
| `ADMIN_SERVICE_URL`, `APPLICATION_SERVICE_URL`, `PROJECT_SERVICE_URL`, `STUDENT_SERVICE_URL`, `COMPANY_SERVICE_URL`, `MATCHING_SERVICE_URL`, `EVALUATION_SERVICE_URL` | `http://localhost:<puerto>` | URLs de los servicios fuente consultados bajo demanda (ver `@collab-u/shared` `MicroserviceHttpClient`) |
