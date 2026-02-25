# shared/src/filters/

Filtros de excepción globales de NestJS.

## Archivos a crear

- **http-exception.filter.ts** — Filtro global que captura todas las excepciones HTTP y las transforma al formato de respuesta estándar `{ success: false, message, statusCode, timestamp }`. Asegura que todos los servicios respondan errores con la misma estructura.
