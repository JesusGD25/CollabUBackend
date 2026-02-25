# Evaluation Service

**Puerto:** 3008
**Base de datos:** `evaluation_db`

## Propósito

Gestiona las evaluaciones bidireccionales: empresas evalúan estudiantes, estudiantes evalúan empresas, y docentes evalúan estudiantes supervisados. Cada evaluación tiene criterios específicos con puntuación.

## Estructura Interna

```
evaluation-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts            ← Conexión a evaluation_db
    ├── evaluations/
    │   ├── evaluations.module.ts
    │   ├── evaluations.controller.ts     ← Crear, listar, responder evaluaciones
    │   ├── evaluations.service.ts
    │   ├── dto/                          ← CreateEvaluationDto, EvaluationResponseDto
    │   ├── entities/
    │   │   ├── evaluation.entity.ts          ← Evaluador, evaluado, rating, comentario
    │   │   ├── evaluation-criteria.entity.ts ← Criterios con puntuación individual
    │   │   └── evaluation-response.entity.ts ← Respuesta del evaluado a la evaluación
    │   └── internal/
    │       └── evaluations-internal.controller.ts
    ├── events/
    │   └── evaluation-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## Eventos

- **Consume:** `application.completed` → Habilita la evaluación mutua
- **Publica:** `evaluation.created`, `evaluation.response.created`
