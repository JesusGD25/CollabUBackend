# Evaluation Service

Microservicio de evaluaciones para la plataforma Collab-U. Gestiona el ciclo completo de evaluaciones entre estudiantes y empresas: creación, calificación por criterios, cálculo de puntuaciones agregadas y generación de eventos al completar.

## Configuración

| Variable | Valor |
|---|---|
| Puerto | 3008 |
| Base de datos | evaluation_db |
| Prefijo API | /api/v1 |
| Swagger | /api/docs |

## Estructura

```
src/
├── evaluation/
│   ├── dto/
│   │   ├── create-evaluation.dto.ts
│   │   ├── submit-evaluation.dto.ts
│   │   ├── create-criterion.dto.ts
│   │   ├── query-evaluation.dto.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── enums.ts                           # CriterionCategory, EvaluationType, RatingScale, EvaluationStatus
│   │   ├── evaluation-criteria.entity.ts      # Criterios configurables del formulario
│   │   ├── evaluation.entity.ts               # Evaluación (relación evaluador → evaluado)
│   │   ├── evaluation-rating.entity.ts        # Calificación por criterio dentro de una evaluación
│   │   └── evaluation-template.entity.ts      # Plantillas reutilizables de evaluación
│   ├── evaluation.service.ts
│   ├── evaluation.service.spec.ts
│   ├── evaluation.controller.ts
│   ├── evaluation.controller.spec.ts
│   ├── evaluation-internal.controller.ts
│   └── evaluation.module.ts
├── config/
│   └── database.config.ts
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Entidades

### EvaluationCriteria
Criterios configurables que componen los formularios de evaluación. Indexados por `category` y `evaluation_type`.

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | varchar(200) | Nombre del criterio |
| `description` | text \| null | Descripción opcional |
| `category` | `CriterionCategory` | `technical`, `soft_skills`, `professional`, `academic`, `general` |
| `evaluationType` | `EvaluationType` | Tipo de evaluación al que pertenece |
| `weight` | decimal(4,3) | Peso del criterio (default 1.0) |
| `ratingScale` | `RatingScale` | `1_to_5`, `1_to_10`, `percentage` |
| `isRequired` | boolean | Si es obligatorio |
| `isActive` | boolean | Si está activo |
| `displayOrder` | integer | Orden de presentación |

### Evaluation
Evaluación entre dos usuarios vinculada a una postulación. Restricción `UNIQUE(applicationId, evaluatorId, evaluationType)`.

| Campo | Tipo | Descripción |
|---|---|---|
| `applicationId` | uuid | Ref lógica → application_db |
| `projectId` | uuid | Ref lógica → project_db |
| `evaluatorId` | uuid | Usuario que evalúa |
| `evaluatedId` | uuid | Usuario evaluado |
| `evaluationType` | `EvaluationType` | Tipo de evaluación |
| `status` | `EvaluationStatus` | `pending`, `in_progress`, `completed`, `expired` |
| `overallScore` | decimal(5,2) \| null | Promedio calculado al completar |
| `overallComment` | text \| null | Comentario general |
| `strengths` | text \| null | Fortalezas observadas |
| `areasForImprovement` | text \| null | Áreas de mejora |
| `isAnonymous` | boolean | Si es anónima |
| `dueDate` | timestamptz \| null | Fecha límite |
| `completedAt` | timestamptz \| null | Fecha de completación |

### EvaluationRating
Calificación de un criterio específico dentro de una evaluación. Restricción `UNIQUE(evaluationId, criterionId)`.

| Campo | Tipo | Descripción |
|---|---|---|
| `evaluationId` | uuid | Evaluación padre |
| `criterionId` | uuid | Criterio evaluado |
| `score` | decimal(5,2) | Puntuación (0–100) |
| `comment` | text \| null | Comentario sobre el criterio |

### EvaluationTemplate
Plantillas predefinidas de evaluación con conjuntos de criterios.

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | varchar(200) | Nombre de la plantilla |
| `evaluationType` | `EvaluationType` | Tipo de evaluación |
| `criteriaIds` | uuid[] | Array de IDs de criterios |
| `isDefault` | boolean | Si es la plantilla por defecto |
| `isActive` | boolean | Si está activa |
| `createdBy` | uuid \| null | Usuario que la creó |

## Enums

- **EvaluationType**: `company_evaluates_student`, `student_evaluates_company`, `supervisor_evaluates_student`, `self_evaluation`
- **EvaluationStatus**: `pending`, `in_progress`, `completed`, `expired`
- **CriterionCategory**: `technical`, `soft_skills`, `professional`, `academic`, `general`
- **RatingScale**: `1_to_5`, `1_to_10`, `percentage`

## Endpoints

### Evaluaciones (con JWT)
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/api/v1/evaluations` | Crear evaluación pendiente | STUDENT, COMPANY, ADMIN |
| GET | `/api/v1/evaluations/my/as-evaluator` | Ver mis evaluaciones como evaluador | STUDENT, COMPANY, ADMIN |
| GET | `/api/v1/evaluations/my/as-evaluated` | Ver evaluaciones recibidas sobre mí | STUDENT, COMPANY, ADMIN |
| GET | `/api/v1/evaluations/:id` | Ver detalle de una evaluación | STUDENT, COMPANY, ADMIN |
| POST | `/api/v1/evaluations/:id/submit` | Completar y enviar una evaluación | STUDENT, COMPANY, ADMIN |
| GET | `/api/v1/evaluations/application/:applicationId` | Ver evaluaciones de una postulación | STUDENT, COMPANY, ADMIN |
| GET | `/api/v1/evaluations/aggregate/:userId` | Ver puntuaciones agregadas de un usuario | STUDENT, COMPANY, ADMIN |

### Criterios y Plantillas (con JWT)
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/v1/evaluations/criteria` | Ver criterios activos (filtro por tipo) | STUDENT, COMPANY, ADMIN |
| POST | `/api/v1/evaluations/criteria` | Crear criterio de evaluación | ADMIN |
| GET | `/api/v1/evaluations/templates` | Ver plantillas activas (filtro por tipo) | STUDENT, COMPANY, ADMIN |

### Internos (sin JWT — solo para otros microservicios)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/internal/evaluations/application/:applicationId` | Obtener evaluaciones de una postulación |
| GET | `/internal/evaluations/aggregate/:evaluatedId` | Obtener puntuaciones agregadas de un usuario |

### Health
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |

## Lógica de Negocio

### Flujo de evaluación
1. Se crea la evaluación con estado `pending`
2. El evaluador llena el formulario y llama a `/:id/submit`
3. Al enviar, se calcula `overallScore` como promedio de todos los ratings
4. El estado cambia a `completed` y se publica el evento `evaluation.completed`

### Validaciones
- Solo el evaluador puede completar su propia evaluación (`ForbiddenException`)
- Una evaluación `completed` no puede volver a completarse (`ConflictException`)
- Una evaluación `expired` no puede completarse (`BadRequestException`)
- No pueden existir dos evaluaciones del mismo tipo para la misma postulación del mismo evaluador (`ConflictException`)

### Puntuaciones agregadas
`getAggregateScores(evaluatedId)` retorna:
- `averageScore`: promedio global de todas las evaluaciones completadas
- `completedCount`: total de evaluaciones completadas
- `byType`: promedio desglosado por `EvaluationType`

## Eventos

### Publica
| Evento | Cuándo | Datos |
|---|---|---|
| `evaluation.created` | Al crear una evaluación | `{ evaluationId, applicationId, projectId, evaluatorId, evaluatedId, evaluationType }` |
| `evaluation.completed` | Al completar una evaluación | `{ evaluationId, applicationId, projectId, evaluatedId, evaluationType, overallScore }` |

## Variables de entorno

```env
PORT=3008
DB_HOST=localhost
DB_PORT=5435
DB_USERNAME=collabu_admin
DB_PASSWORD=collabu_secret_2025
DB_NAME=evaluation_db
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

**30 tests** en 2 suites:
- `evaluation.service.spec.ts` — 19 tests (CRUD, validaciones de estado, paginación, agregados, criterios, templates)
- `evaluation.controller.spec.ts` — 11 tests (delegación, parámetros de usuario)

## Swagger
Disponible en: `http://localhost:3008/api/docs`
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
