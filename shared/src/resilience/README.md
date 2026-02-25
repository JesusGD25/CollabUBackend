# shared/src/resilience/

Patrones de resiliencia para proteger la comunicación entre microservicios.

## Archivos a crear

- **circuit-breaker.service.ts** — Implementación del patrón Circuit Breaker con tres estados (CLOSED, OPEN, HALF_OPEN). Protege las llamadas HTTP entre servicios: si un servicio falla repetidamente, el circuito se abre y evita enviar más peticiones durante un periodo configurable.
- **retry.util.ts** — Utilidad de reintentos con backoff exponencial. Configurable en número de reintentos, delay base y máximo. Se usa junto con el Circuit Breaker para reintentar operaciones fallidas de forma controlada.
