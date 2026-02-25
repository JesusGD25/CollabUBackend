# docker/nginx/

Configuración del reverse proxy Nginx.

## Archivos a crear

- **nginx.conf** — Configuración principal que:
  - Rutea `/api/*` al API Gateway (puerto 3000)
  - Rutea `/*` al frontend Angular
  - Proxy de WebSocket para `/socket.io/` (chat y notificaciones)
  - Configuración SSL/TLS en producción
  - Headers de seguridad (HSTS, X-Content-Type-Options, etc.)
  - Compresión gzip
- **ssl/** — Directorio para certificados SSL (solo producción). Contiene `collab-u.crt` y `collab-u.key`.
