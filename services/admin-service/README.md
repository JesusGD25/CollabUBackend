# Admin Service

Microservicio administrativo de **Collab-U**. Gestiona períodos y programas académicos, verificación de empresas, supervisores académicos y configuraciones del sistema.

## Información General

- **Puerto**: `3011`
- **Base de datos**: `admin_db` (PostgreSQL, puerto 5435)
- **Prefijo API pública**: `api/v1/admin`

## Endpoints

### Públicos (`api/v1/admin`) — requieren JWT

#### Dashboard
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| `GET` | `/dashboard` | Estadísticas administrativas | ADMIN, FACULTY |

#### Períodos Académicos
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| `GET` | `/periods` | Listar períodos (filtrable por status/isCurrent) | Todos |
| `POST` | `/periods` | Crear período | ADMIN |
| `GET` | `/periods/:id` | Detalle de un período | Todos |
| `PUT` | `/periods/:id` | Actualizar período | ADMIN |

#### Programas Académicos
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| `GET` | `/programs` | Listar programas | Todos |
| `POST` | `/programs` | Crear programa | ADMIN |
| `GET` | `/programs/:id` | Detalle de un programa | Todos |
| `PUT` | `/programs/:id` | Actualizar programa | ADMIN |

#### Verificación de Empresas
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| `GET` | `/companies/verifications` | Historial de verificaciones | ADMIN, FACULTY |
| `PUT` | `/companies/:companyId/verify` | Verificar empresa | ADMIN, FACULTY |

#### Supervisores
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| `GET` | `/supervisors` | Listar supervisores | ADMIN, FACULTY |
| `POST` | `/supervisors` | Registrar supervisor | ADMIN |
| `POST` | `/supervisors/assign` | Asignar supervisor a estudiante/proyecto | ADMIN, FACULTY |
| `GET` | `/supervisors/my-students` | Mis estudiantes supervisados | FACULTY |

#### Configuraciones del Sistema
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| `GET` | `/settings` | Listar configuraciones | ADMIN |
| `PUT` | `/settings` | Crear o actualizar configuración (upsert) | ADMIN |
| `GET` | `/settings/:key` | Obtener configuración por clave | ADMIN |

### Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servicio |

## Entidades

### `academic_periods`
Períodos académicos (ej. `2025-A`). Restricción `UNIQUE(name)`. Sólo un período puede tener `isCurrent=true` a la vez (se gestiona automáticamente en `updatePeriod`). Estados: `planning`, `active`, `closed`, `archived`.

### `academic_programs`
Programas académicos (ej. `ISC`). Restricción `UNIQUE(code)`. Campos clave: `name`, `code`, `faculty`, `requiresInternship`, `minimumSemesterForInternship`.

### `company_verifications`
Registro histórico de acciones de verificación sobre empresas. Acciones: `approved`, `rejected`, `suspended`, `reactivated`. Almacena `documentsReviewed` como JSONB.

### `supervisors`
Perfiles de supervisores académicos vinculados a un `userId`. Restricciones `UNIQUE(user_id)` y `UNIQUE(employee_code)`. Roles: `academic_director`, `internship_coordinator`, `thesis_advisor`, `faculty_supervisor`. Controla `currentStudents` vs `maxStudents`.

### `supervisor_assignments`
Asignaciones de supervisor a estudiante/proyecto. Restricción `UNIQUE(student_id, project_id)`. Incrementa `currentStudents` del supervisor al asignar.

### `system_settings`
Configuraciones clave-valor en formato JSONB. Restricción `UNIQUE(key)`. Soporta categorías para agrupar.

## Enums

- **PeriodStatus**: `planning`, `active`, `closed`, `archived`
- **VerificationAction**: `approved`, `rejected`, `suspended`, `reactivated`
- **SupervisorRole**: `academic_director`, `internship_coordinator`, `thesis_advisor`, `faculty_supervisor`

## Eventos RabbitMQ Publicados

| Evento | Cuándo |
|--------|--------|
| `admin.period.created` | Al crear un período académico |
| `admin.company.verified` | Al verificar una empresa |
| `admin.supervisor.assigned` | Al asignar un supervisor |

## Tests

```bash
npx jest --verbose --forceExit
```

**42 tests — 42 passing**

- `admin.service.spec.ts` — 26 tests
- `admin.controller.spec.ts` — 15 tests
- `app.controller.spec.ts` — 1 test

## Swagger

Disponible en: `http://localhost:3011/api/docs`

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
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
