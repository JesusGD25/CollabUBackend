# shared/src/rabbitmq/

Módulo de conexión y comunicación asíncrona con RabbitMQ.

## Archivos a crear

- **rabbitmq.module.ts** — Módulo NestJS que configura la conexión a RabbitMQ. Importado por cada servicio que necesite publicar o consumir eventos.
- **rabbitmq.config.ts** — Configuración de conexión (host, port, credentials, exchange, queues) leída desde variables de entorno.
- **event-publisher.service.ts** — Servicio para publicar eventos de dominio al exchange de RabbitMQ. Método principal: `publish(routingKey, payload)`.
- **event-subscriber.service.ts** — Servicio base para suscribirse a eventos. Gestiona la conexión al queue y el acknowledgment de mensajes.
