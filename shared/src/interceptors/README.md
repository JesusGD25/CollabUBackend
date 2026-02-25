# shared/src/interceptors/

Interceptores de NestJS compartidos entre servicios.

## Archivos a crear

- **transform.interceptor.ts** — Interceptor que envuelve automáticamente todas las respuestas exitosas en el formato estándar `ApiResponse<T>` con `{ success: true, data, timestamp }`.
- **logging.interceptor.ts** — Interceptor que registra cada petición con método, URL, tiempo de ejecución y código de respuesta. Útil para debugging y monitoreo.
