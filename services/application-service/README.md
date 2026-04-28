# Application Service

Microservicio de gestión de postulaciones para la plataforma Collab-U. Maneja el ciclo de vida completo de una postulación: desde que un estudiante aplica a un proyecto hasta su finalización, incluyendo entrevistas y entregables.

## Puerto
- **3006** (por defecto)

## Base de Datos
- PostgreSQL: `application_db` en puerto `5435`

## Estructura

```
src/
├── application/
│   ├── dto/
│   │   ├── create-application.dto.ts
│   │   ├── update-application-status.dto.ts
│   │   ├── withdraw-application.dto.ts
│   │   ├── schedule-interview.dto.ts
│   │   ├── update-interview.dto.ts         # CompleteInterviewDto, CancelInterviewDto, RescheduleInterviewDto
│   │   ├── submit-deliverable.dto.ts
│   │   ├── review-deliverable.dto.ts
│   │   ├── application-query.dto.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── application.entity.ts           # Entidad principal (8 estados)
│   │   ├── application-timeline.entity.ts  # Auditoría de cambios de estado
│   │   ├── interview.entity.ts             # Entrevistas (4 tipos, 5 estados)
│   │   └── student-deliverable.entity.ts   # Entregables del estudiante
│   ├── application.service.ts
│   ├── application.service.spec.ts
│   ├── application.controller.ts
│   ├── application.controller.spec.ts
│   ├── application-internal.controller.ts
│   ├── application-events.subscriber.ts
│   ├── application-events.subscriber.spec.ts
│   └── application.module.ts
├── config/
│   └── database.config.ts
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Entidades

### Application
Postulación de un estudiante a un proyecto. Restricción `UNIQUE(projectId, studentId)`.

| Estado | Descripción |
|--------|-------------|
| `pending` | Recién enviada, esperando revisión |
| `under_review` | La empresa está revisando |
| `shortlisted` | Preseleccionada para entrevista |
| `interview` | En proceso de entrevistas |
| `accepted` | Aceptada — el estudiante puede enviar entregables |
| `rejected` | Rechazada (requiere razón) |
| `withdrawn` | Retirada por el estudiante |
| `completed` | Proyecto finalizado |

**Transiciones válidas:**
```
pending → under_review | rejected
under_review → shortlisted | rejected
shortlisted → interview | rejected
interview → accepted | rejected
accepted → completed
```

### ApplicationTimeline
Registra cada cambio de estado con `fromStatus`, `toStatus`, `changedByUserId`, `comment` y `metadata` (jsonb).

### Interview
Tipos: `phone`, `video`, `in_person`, `technical`.
Estados: `scheduled`, `completed`, `cancelled`, `rescheduled`, `no_show`.

### StudentDeliverable
Estados: `pending`, `submitted`, `approved`, `rejected`, `needs_revision`.
Solo se pueden enviar entregables en postulaciones con estado `accepted`.

## Endpoints

### Postulaciones (con JWT)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/api/v1/applications` | Postularse a un proyecto | STUDENT |
| GET | `/api/v1/applications/my` | Ver mis postulaciones | STUDENT |
| GET | `/api/v1/applications/:id` | Detalle de una postulación | Autenticado |
| GET | `/api/v1/applications/:id/timeline` | Historial de cambios de estado | Autenticado |
| GET | `/api/v1/applications/project/:projectId` | Postulaciones de un proyecto | COMPANY, ADMIN |
| PATCH | `/api/v1/applications/:id/status` | Cambiar estado (empresa) | COMPANY, ADMIN |
| PATCH | `/api/v1/applications/:id/withdraw` | Retirar postulación (estudiante) | STUDENT |

### Entrevistas (con JWT)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/api/v1/applications/:id/interviews` | Programar entrevista | COMPANY, ADMIN |
| GET | `/api/v1/applications/:id/interviews` | Ver entrevistas | Autenticado |
| PATCH | `/api/v1/applications/:id/interviews/:interviewId/complete` | Completar entrevista | COMPANY, ADMIN |
| PATCH | `/api/v1/applications/:id/interviews/:interviewId/cancel` | Cancelar entrevista | COMPANY, ADMIN |
| POST | `/api/v1/applications/:id/interviews/:interviewId/reschedule` | Reagendar entrevista | COMPANY, ADMIN |

### Entregables (con JWT)
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/api/v1/applications/:id/deliverables` | Enviar entregable | STUDENT |
| PATCH | `/api/v1/applications/:id/deliverables/:deliverableId` | Actualizar entregable | STUDENT |
| GET | `/api/v1/applications/:id/deliverables` | Ver entregables | Autenticado |
| PATCH | `/api/v1/applications/:id/deliverables/:deliverableId/approve` | Aprobar entregable | COMPANY, ADMIN |
| PATCH | `/api/v1/applications/:id/deliverables/:deliverableId/reject` | Rechazar entregable | COMPANY, ADMIN |
| PATCH | `/api/v1/applications/:id/deliverables/:deliverableId/request-revision` | Solicitar revisión | COMPANY, ADMIN |

### Internos (sin JWT — solo para otros microservicios)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/internal/applications/project/:projectId/count` | Total de postulaciones por proyecto |
| GET | `/internal/applications/student/:studentId/active-count` | Postulaciones pendientes del estudiante |
| GET | `/internal/applications/project/:projectId` | Listar postulaciones de un proyecto |
| POST | `/internal/applications/student/:studentId/withdraw-all` | Retirar todas las postulaciones activas |

### Health
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio y conexión a DB |

## Eventos

### Publica
| Evento | Cuándo |
|--------|--------|
| `application.created` | Al crear una postulación |
| `application.status.changed` | Al cambiar cualquier estado (incluyendo retiro) |

### Suscribe
| Evento | Acción |
|--------|--------|
| `auth.user.deactivated` | Retira todas las postulaciones activas del usuario |

## Dependencias externas
| Servicio | Uso |
|----------|-----|
| **Project Service** (`:3005`) | Verificar que el proyecto existe y está publicado; incrementar contador de aplicaciones |
| **Matching Service** (`:3007`) | Calcular `matchScore` al momento de postular (falla de forma no bloqueante) |

## Variables de entorno
```env
PORT=3006
DB_HOST=localhost
DB_PORT=5435
DB_USERNAME=collabu_admin
DB_PASSWORD=collabu_secret_2025
DB_NAME=application_db
PROJECT_SERVICE_URL=http://localhost:3005
MATCHING_SERVICE_URL=http://localhost:3007
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=<mismo valor que auth-service>
```

## Instalación y ejecución

```bash
npm install

# desarrollo
npm run start:dev

# producción
npm run start:prod
```

## Tests

```bash
npx jest --verbose --forceExit
```

**47 tests** en 4 suites:
- `app.controller.spec.ts` — 1 test
- `application.service.spec.ts` — 31 tests
- `application.controller.spec.ts` — 13 tests
- `application-events.subscriber.spec.ts` — 3 tests

## Swagger
Disponible en: `http://localhost:3006/api/docs`
