# Matching Service

Microservicio de compatibilidad y recomendaciones para la plataforma Collab-U. Calcula puntuaciones de compatibilidad entre estudiantes y proyectos usando un algoritmo ponderado de 7 factores, genera recomendaciones automáticas y permite gestionar los pesos del algoritmo.

## Configuración

| Variable | Valor |
|---|---|
| Puerto | 3007 |
| Base de datos | matching_db |
| Prefijo API | /api/v1 |
| Swagger | /api/docs |

## Estructura

```
src/
├── matching/
│   ├── dto/
│   │   ├── calculate-match.dto.ts
│   │   ├── batch-calculate-match.dto.ts
│   │   ├── update-weights.dto.ts
│   │   ├── recommendation-query.dto.ts
│   │   ├── submit-feedback.dto.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── enums.ts                         # MatchFactor, WeightScope, CompatibilityLevel, TargetType, RecommendationType, FeedbackType
│   │   ├── match-weight.entity.ts           # Pesos configurables del algoritmo
│   │   ├── match-result.entity.ts           # Resultado de compatibilidad entre estudiante y proyecto
│   │   ├── match-recommendation.entity.ts   # Recomendaciones generadas automáticamente
│   │   └── match-feedback.entity.ts         # Feedback del usuario sobre una recomendación
│   ├── matching.service.ts
│   ├── matching.service.spec.ts
│   ├── matching.controller.ts
│   ├── matching.controller.spec.ts
│   ├── matching-internal.controller.ts
│   └── matching.module.ts
├── config/
│   └── database.config.ts
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Entidades

### MatchWeight
Pesos configurables por factor del algoritmo. Restricción `UNIQUE(factorName, scope, scopeId)`.
Permite pesos globales (`scope = global`) o personalizados por empresa/proyecto (`scope = company | project`).

| Campo | Tipo | Descripción |
|---|---|---|
| `factorName` | `MatchFactor` enum | Factor del algoritmo |
| `weight` | decimal(4,3) | Peso entre 0 y 1 |
| `scope` | `WeightScope` | `global`, `company` o `project` |
| `scopeId` | uuid \| null | ID de empresa o proyecto (si aplica) |
| `isActive` | boolean | Si el peso está activo |

### MatchResult
Resultado de compatibilidad calculado. Restricción `UNIQUE(studentId, projectId)`.
Los resultados expiran en 7 días y se recalculan al volver a solicitarlos.

| Campo | Tipo | Descripción |
|---|---|---|
| `overallScore` | decimal(5,2) | Puntuación total (0–100) |
| `skillsScore` | decimal(5,2) \| null | Factor habilidades |
| `proficiencyScore` | decimal(5,2) \| null | Factor nivel de habilidades |
| `programScore` | decimal(5,2) \| null | Factor programa académico |
| `semesterScore` | decimal(5,2) \| null | Factor semestre mínimo |
| `availabilityScore` | decimal(5,2) \| null | Factor disponibilidad |
| `experienceScore` | decimal(5,2) \| null | Factor experiencia |
| `languageScore` | decimal(5,2) \| null | Factor idiomas |
| `weightsSnapshot` | jsonb | Pesos usados al calcular |
| `compatibilityLevel` | `CompatibilityLevel` \| null | `HIGH`, `MEDIUM` o `LOW` |
| `isRecommended` | boolean | Si supera el umbral (≥70) |
| `expiresAt` | timestamp \| null | Fecha de expiración del resultado |

### MatchRecommendation
Recomendaciones generadas automáticamente cuando `isRecommended = true`.

| Campo | Tipo | Descripción |
|---|---|---|
| `targetUserId` | uuid | Usuario destinatario |
| `targetType` | `TargetType` | `student` o `company` |
| `recommendationType` | `RecommendationType` | `project_for_student` o `student_for_project` |
| `isSeen` | boolean | Si fue vista |
| `isDismissed` | boolean | Si fue descartada |

### MatchFeedback
Feedback del usuario sobre un resultado de compatibilidad. Restricción `UNIQUE(matchResultId, userId)`.

| Campo | Tipo | Descripción |
|---|---|---|
| `feedbackType` | `FeedbackType` | `relevant`, `not_relevant`, `already_applied`, `not_interested` |
| `comment` | text \| null | Comentario opcional |

## Algoritmo de Compatibilidad

Suma ponderada de 7 factores. Puntuación final en rango 0–100.

| Factor | Peso por defecto | Lógica |
|---|---|---|
| `skills_match` | 0.35 | Intersección de habilidades requeridas vs del estudiante |
| `proficiency_match` | 0.15 | Promedio de `min(nivelEstudiante / nivelRequerido, 1)` por habilidad |
| `program_match` | 0.15 | Exacto = 1.0 · misma facultad = 0.5 · otro = 0.0 |
| `semester_match` | 0.10 | `estudiante.semestre >= proyecto.minimoSemestre` → 1.0 · sino 0.0 |
| `availability_match` | 0.10 | flexible/remoto = 1.0 · coincide = 1.0 · no coincide = 0.3 · desconocido = 0.7 |
| `experience_match` | 0.10 | `min(añosTotales / añosDeseados, 1)` |
| `language_match` | 0.05 | Intersección de idiomas requeridos vs del estudiante |

**Niveles de compatibilidad:**
- `HIGH` — puntuación ≥ 70
- `MEDIUM` — puntuación entre 40 y 69
- `LOW` — puntuación < 40

Los resultados con puntuación ≥ 70 se marcan `isRecommended = true` y generan una `MatchRecommendation` automáticamente.

## Enums

- **MatchFactor**: `skills_match`, `proficiency_match`, `program_match`, `semester_match`, `availability_match`, `experience_match`, `language_match`
- **WeightScope**: `global`, `company`, `project`
- **CompatibilityLevel**: `HIGH`, `MEDIUM`, `LOW`
- **TargetType**: `student`, `company`
- **RecommendationType**: `project_for_student`, `student_for_project`
- **FeedbackType**: `relevant`, `not_relevant`, `already_applied`, `not_interested`

## Endpoints

### Resultados y Cálculo (con JWT)
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/v1/matching/results/student/:studentId` | Resultados de un estudiante (paginado) | STUDENT, COMPANY, ADMIN |
| GET | `/api/v1/matching/results/project/:projectId` | Resultados de un proyecto (paginado) | COMPANY, ADMIN |
| GET | `/api/v1/matching/results/student/:studentId/project/:projectId` | Resultado específico | STUDENT, COMPANY, ADMIN |
| POST | `/api/v1/matching/calculate` | Calcular compatibilidad manualmente | COMPANY, ADMIN |
| POST | `/api/v1/matching/batch-calculate` | Calcular en lote para un proyecto | COMPANY, ADMIN |

### Pesos del Algoritmo (con JWT)
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/v1/matching/weights` | Ver pesos actuales | ADMIN |
| PUT | `/api/v1/matching/weights` | Actualizar pesos (deben sumar 1.0) | ADMIN |

### Recomendaciones (con JWT)
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/v1/matching/recommendations` | Ver mis recomendaciones | Autenticado |
| PATCH | `/api/v1/matching/recommendations/:id/seen` | Marcar como vista | Autenticado |
| PATCH | `/api/v1/matching/recommendations/:id/dismiss` | Descartar recomendación | Autenticado |

### Feedback (con JWT)
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/api/v1/matching/results/:matchResultId/feedback` | Enviar feedback sobre un resultado | Autenticado |

### Internos (sin JWT — solo para otros microservicios)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/internal/matching/calculate-for-application` | Calcula score y retorna sólo el número (usado por Application Service) |
| POST | `/internal/matching/batch-calculate` | Cálculo en lote sin autenticación |

### Health
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |

## Eventos

### Publica
| Evento | Cuándo | Datos |
|---|---|---|
| `matching.score.calculated` | Al completar un cálculo | `{ matchResultId, studentId, projectId, overallScore, compatibilityLevel, isRecommended }` |

## Dependencias externas
| Servicio | Ruta interna | Uso |
|---|---|---|
| **Student Service** (`:3003`) | `GET /internal/students/:id/matching-data` | Obtener datos del estudiante para el algoritmo |
| **Project Service** (`:3005`) | `GET /internal/projects/:id/matching-data` | Obtener datos del proyecto para el algoritmo |

> Ambas llamadas fallan de forma no bloqueante: si el servicio no responde, se usa un objeto vacío y el score será bajo.

## Variables de entorno
```env
PORT=3007
DB_HOST=localhost
DB_PORT=5435
DB_USERNAME=collabu_admin
DB_PASSWORD=collabu_secret_2025
DB_NAME=matching_db
STUDENT_SERVICE_URL=http://localhost:3003
PROJECT_SERVICE_URL=http://localhost:3005
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

**29 tests** en 2 suites:
- `matching.service.spec.ts` — 17 tests (algoritmo, CRUD, validaciones)
- `matching.controller.spec.ts` — 12 tests (delegación, lógica de roles en recomendaciones)

## Swagger
Disponible en: `http://localhost:3007/api/docs`
