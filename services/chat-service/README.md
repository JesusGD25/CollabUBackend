# Chat Service

**Puerto:** 3010
**Base de datos:** `chat_db`

## Propósito

Mensajería en tiempo real entre usuarios del sistema (estudiante-empresa, estudiante-docente, etc.). Usa WebSocket (Socket.IO) para comunicación bidireccional con indicadores de "escribiendo", estado online/offline y confirmación de lectura.

## Estructura Interna

```
chat-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   └── database.config.ts       ← Conexión a chat_db
    ├── chat/
    │   ├── chat.module.ts
    │   ├── chat.controller.ts       ← REST: obtener conversaciones, historial de mensajes
    │   ├── chat.service.ts
    │   ├── dto/
    │   ├── entities/
    │   │   ├── conversation.entity.ts             ← Conversación entre 2+ usuarios
    │   │   ├── message.entity.ts                  ← Mensaje con contenido, timestamp, leído
    │   │   └── conversation-participant.entity.ts ← Participantes de cada conversación
    │   └── internal/
    │       └── chat-internal.controller.ts
    ├── websocket/
    │   └── chat.gateway.ts          ← Gateway WebSocket: send_message, typing, join/leave room
    ├── events/
    │   └── chat-events.subscriber.ts
    └── health/
        └── health.controller.ts
```

## WebSocket Events

- `send_message` — Enviar mensaje
- `typing` — Indicador de escritura
- `join_room` / `leave_room` — Unirse/salir de sala de conversación
- `mark_as_read` — Marcar mensajes como leídos
- `new_message` — Evento emitido a los participantes cuando llega un mensaje
- `user_status` — Cambio de estado online/offline

## Eventos RabbitMQ

- **Publica:** `chat.message.sent` → notification-service genera notificaciones
