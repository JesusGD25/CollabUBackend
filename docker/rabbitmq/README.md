# docker/rabbitmq/

Configuración personalizada de RabbitMQ.

## Archivos a crear

- **rabbitmq.conf** — Configuración custom del broker de mensajería:
  - Exchange principal: `collab_u_exchange` (tipo topic)
  - 13 queues (una por servicio que consume eventos)
  - Bindings entre routing keys y queues
  - Configuración de memoria y disco
  - Management plugin habilitado (panel web en puerto 15672)
