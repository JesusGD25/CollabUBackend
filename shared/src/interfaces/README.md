# shared/src/interfaces/

Interfaces TypeScript compartidas entre servicios.

## Archivos a crear

- **domain-event.interface.ts** — Interfaz `IDomainEvent` con campos `eventType`, `payload`, `timestamp`, `source`. Usada por el sistema de eventos RabbitMQ.
- **service-response.interface.ts** — Interfaz para respuestas internas entre microservicios (comunicación HTTP service-to-service).
