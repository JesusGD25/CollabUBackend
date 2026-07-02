# Chat Service

Microservicio de mensajería de **Collab-U**. Gestiona conversaciones directas, grupales y por proyecto, mensajes con paginación por cursor, reacciones, adjuntos y búsqueda full-text.

## Información General

- **Puerto**: `3010`
- **Base de datos**: `chat_db` (PostgreSQL, puerto 5435)
- **Prefijo API pública**: `api/v1/chat`
- **Prefijo API interna**: `internal/chat`

## Endpoints

### Públicos (`api/v1/chat`) — requieren JWT

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/conversations` | Listar mis conversaciones (paginado) |
| `POST` | `/conversations` | Crear conversación (directa, grupal o por proyecto) |
| `GET` | `/conversations/:id` | Detalle de una conversación |
| `PUT` | `/conversations/:id/archive` | Archivar conversación |
| `GET` | `/conversations/:id/messages` | Mensajes de una conversación (cursor-based) |
| `POST` | `/conversations/:id/messages` | Enviar mensaje |
| `PUT` | `/conversations/:id/read` | Marcar conversación como leída |
| `PUT` | `/messages/:messageId` | Editar mensaje (ventana de 15 min) |
| `DELETE` | `/messages/:messageId` | Eliminar mensaje (soft delete) |
| `POST` | `/messages/:messageId/reactions/:emoji` | Agregar reacción |
| `DELETE` | `/messages/:messageId/reactions/:emoji` | Eliminar reacción |
| `GET` | `/search` | Buscar mensajes por texto |

### Internos (`internal/chat`) — sin autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/conversations/project/:projectId` | Conversaciones de un proyecto |
| `GET` | `/conversations/:conversationId/participants` | Participantes activos |

### Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servicio |

## Entidades

### `conversations`
Conversación entre usuarios. Tipos: `direct`, `group`, `project`. Campos clave: `type`, `name`, `projectId`, `isActive`, `lastMessageAt`, `lastMessagePreview`, `createdBy`.

### `conversation_participants`
Participantes de una conversación. Restricción `UNIQUE(conversation_id, user_id)`. Campos clave: `userId`, `role` (`member`, `admin`, `owner`), `isMuted`, `unreadCount`, `lastReadAt`, `lastReadMessageId`, `isActive`.

### `messages`
Mensajes de una conversación. Soporta respuestas anidadas (`replyToId`), edición (`isEdited`, `editedAt`) y borrado suave (`isDeleted`, `deletedAt`). Tipos: `text`, `file`, `image`, `system`, `link`.

### `message_attachments`
Archivos adjuntos a un mensaje. Campos: `fileUrl`, `fileName`, `fileSizeBytes`, `mimeType`, `thumbnailUrl`.

### `message_reactions`
Reacciones emoji a mensajes. Restricción `UNIQUE(message_id, user_id, emoji)`. Idempotente al agregar.

## Enums

- **ConversationType**: `direct`, `group`, `project`
- **ParticipantRole**: `member`, `admin`, `owner`
- **MessageType**: `text`, `file`, `image`, `system`, `link`

## Eventos RabbitMQ

### Publicados

| Evento | Cuándo |
|--------|--------|
| `chat.conversation.created` | Al crear una conversación |
| `chat.message.sent` | Al enviar un mensaje |

### Consumidos

| Evento | Cola | Acción |
|--------|------|--------|
| `application.status.changed` | `chat-service.application.status.changed` | Auto-crea conversación directa entre empresa y estudiante al aceptar una postulación |

## Tests

```bash
npx jest --verbose --forceExit
```

**36 tests — 36 passing**

- `chat.service.spec.ts` — 23 tests
- `chat.controller.spec.ts` — 12 tests
- `app.controller.spec.ts` — 1 test

## Swagger

Disponible en: `http://localhost:3010/api/docs`
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
