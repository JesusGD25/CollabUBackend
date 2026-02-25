# Matching Service

**Puerto:** 3007
**Base de datos:** `matching_db`

## Propósito

Ejecuta el algoritmo de matching que calcula la compatibilidad entre estudiantes y proyectos. Genera recomendaciones personalizadas para cada estudiante basándose en 5 dimensiones ponderadas.

## Algoritmo de Matching

El score total se calcula como:

```
S_total = w1·S_skills + w2·S_experiencia + w3·S_educacion + w4·S_disponibilidad + w5·S_rating
```

Pesos por defecto: skills 40%, experiencia 25%, educación 15%, disponibilidad 10%, rating 10%

## Estructura Interna

```
matching-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts             ← Conexión a matching_db
    ├── matching/
    │   ├── matching.module.ts
    │   ├── matching.controller.ts         ← Obtener recomendaciones, recalcular
    │   ├── matching.service.ts            ← Orquestación del matching
    │   ├── matching-algorithm.service.ts  ← Lógica pura del algoritmo de scoring
    │   ├── dto/
    │   ├── entities/
    │   │   ├── match-result.entity.ts     ← Score total y desglose por dimensión
    │   │   ├── matching-weight.entity.ts  ← Pesos configurables del algoritmo
    │   │   └── recommendation.entity.ts   ← Recomendaciones generadas
    │   └── internal/
    │       └── matching-internal.controller.ts
    ├── events/
    │   └── matching-events.subscriber.ts  ← Escucha project.published y student.skills.updated
    └── health/
        └── health.controller.ts
```

## Eventos

- **Consume:** `project.published`, `student.skills.updated`, `student.profile.updated` → Recalcula matches
- **Publica:** `matching.calculated` → Notifica nuevas recomendaciones
