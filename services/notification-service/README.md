# Notification Service

Microservicio de notificaciones de **Collab-U**. Gestiona notificaciones in-app, preferencias de usuario, suscripciones push y cola de correos electrónicos.

## Información General

- **Puerto**: `3009`
- **Base de datos**: `notification_db` (PostgreSQL, puerto 5435)
- **Prefijo API pública**: `api/v1/notifications`
- **Prefijo API interna**: `internal/notifications`

## Endpoints

### Públicos (`api/v1/notifications`) — requieren JWT

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listar mis notificaciones (paginado, filtrable) |
| `GET` | `/unread-count` | Obtener conteo de no leídas |
| `GET` | `/preferences` | Obtener preferencias del usuario |
| `PATCH` | `/preferences` | Actualizar preferencias |
| `PATCH` | `/read` | Marcar notificaciones como leídas (bulk o todas) |
| `PATCH` | `/:id/read` | Marcar una notificación como leída |
| `DELETE` | `/:id` | Eliminar una notificación |
| `POST` | `/push-subscriptions` | Registrar suscripción push |
| `DELETE` | `/push-subscriptions/:id` | Eliminar suscripción push |

### Internos (`internal/notifications`) — sin autenticación (sólo red interna)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/` | Crear notificación (usado por otros servicios) |
| `GET` | `/user/:userId` | Listar notificaciones de un usuario |
| `GET` | `/user/:userId/unread-count` | Conteo de no leídas |

### Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servicio |

## Entidades

### `notifications`
Notificaciones individuales para un usuario. Campos clave: `userId`, `type` (enum), `title`, `message`, `data` (jsonb), `channel`, `priority`, `isRead`, `readAt`, `actionUrl`, `groupKey`, `expiresAt`.

### `notification_preferences`
Preferencias por usuario (UNIQUE `userId`). Controla qué tipos y canales están habilitados. Soporta `quietHoursStart`/`quietHoursEnd`.

### `email_queue`
Cola de correos pendientes de envío. Soporta templates y envío programado (`scheduledFor`). Estados: `queued → sending → sent/failed/bounced`.

### `notification_templates`
Templates reutilizables con Handlebars. Asociados a un `notificationType`.

### `push_subscriptions`
Suscripciones Web Push por usuario. UNIQUE por `(userId, endpoint)`. Soporta `web`, `android`, `ios`.

## Tipos de Notificación (NotificationType)

```
application_received, application_status_changed, application_accepted,
application_rejected, interview_scheduled, interview_reminder,
evaluation_pending, evaluation_completed, project_new,
project_deadline_reminder, project_status_changed, match_recommendation,
message_received, deliverable_feedback, company_verified, system_announcement
```

## Eventos RabbitMQ Consumidos

| Evento | Notificación generada | Destinatario |
|--------|-----------------------|--------------|
| `application.created` | `application_received` | company user |
| `application.status.changed` | `application_status_changed / application_accepted / application_rejected` | student user |
| `evaluation.created` | `evaluation_pending` | evaluator |
| `evaluation.completed` | `evaluation_completed` | evaluated user |
| `matching.score.calculated` (isRecommended=true) | `match_recommendation` | student user |

## Tests

```bash
npx jest --verbose --forceExit
```

**30 tests — 30 passing**

- `notification.service.spec.ts` — 21 tests
- `notification.controller.spec.ts` — 9 tests

## Swagger

Disponible en: `http://localhost:3009/api/docs`
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
