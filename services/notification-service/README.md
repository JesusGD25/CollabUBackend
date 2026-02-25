# Notification Service

**Puerto:** 3009
**Base de datos:** `notification_db`

## Propósito

Servicio central de notificaciones. Consume eventos de dominio de todos los demás servicios y genera notificaciones in-app, emails y push en tiempo real vía WebSocket. Es el mayor consumidor de eventos del sistema (~15 routing keys).

## Estructura Interna

```
notification-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   ├── database.config.ts       ← Conexión a notification_db
    │   └── mail.config.ts           ← Configuración SMTP para envío de emails
    ├── notifications/
    │   ├── notifications.module.ts
    │   ├── notifications.controller.ts  ← Listar, marcar como leída, preferencias
    │   ├── notifications.service.ts
    │   ├── dto/
    │   ├── entities/
    │   │   ├── notification.entity.ts           ← Título, mensaje, tipo, leída, actionUrl
    │   │   ├── email-log.entity.ts              ← Registro de emails enviados
    │   │   └── notification-preference.entity.ts ← Preferencias del usuario por tipo
    │   └── internal/
    │       └── notifications-internal.controller.ts
    ├── websocket/
    │   └── notifications.gateway.ts     ← Gateway WebSocket (Socket.IO) para push en tiempo real
    ├── mail/
    │   ├── mail.service.ts              ← Servicio de envío de emails
    │   └── templates/                   ← Plantillas HTML de email (Handlebars)
    │       ├── welcome.hbs
    │       ├── application-status.hbs
    │       ├── evaluation-received.hbs
    │       └── password-reset.hbs
    ├── events/
    │   └── notification-events.subscriber.ts ← Consume ~15 eventos de todos los servicios
    └── health/
        └── health.controller.ts
```

## Eventos que Consume

- `auth.user.created`, `auth.user.verified`
- `application.created`, `application.status.updated`
- `project.published`, `project.closed`
- `evaluation.created`
- `matching.calculated`
- `admin.company.verified`, `admin.supervisor.assigned`
- `chat.message.sent`
- Y otros según se agreguen funcionalidades
