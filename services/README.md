# services/

Directorio que contiene los 14 microservicios del backend. Cada servicio es una aplicación NestJS independiente con su propio `package.json`, `Dockerfile` y base de datos.

## Servicios

| # | Servicio | Puerto | DB | Descripción |
|---|---------|--------|-----|-------------|
| 1 | api-gateway | 3000 | — | Proxy de entrada, ruteo, JWT, rate limiting |
| 2 | auth-service | 3001 | auth_db | Login, registro, JWT, verificación email |
| 3 | user-service | 3002 | user_db | Perfiles de usuario genéricos |
| 4 | student-service | 3003 | student_db | Perfiles de estudiante, skills, documentos |
| 5 | company-service | 3004 | company_db | Perfiles de empresa, contactos |
| 6 | project-service | 3005 | project_db | CRUD de proyectos y requisitos |
| 7 | application-service | 3006 | application_db | Aplicaciones, entrevistas, entregables |
| 8 | matching-service | 3007 | matching_db | Algoritmo de matching y recomendaciones |
| 9 | evaluation-service | 3008 | evaluation_db | Evaluaciones bidireccionales |
| 10 | notification-service | 3009 | notification_db | Notificaciones, email, WebSocket push |
| 11 | chat-service | 3010 | chat_db | Mensajería en tiempo real |
| 12 | admin-service | 3011 | admin_db | Verificaciones, supervisores, periodos |
| 13 | analytics-service | 3012 | analytics_db | Métricas y reportes |
| 14 | storage-service | 3013 | storage_db | Archivos y documentos |

## Estructura Común de Cada Servicio

Todos los servicios siguen la misma estructura base:

```
[service-name]/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── src/
    ├── main.ts              ← Bootstrap
    ├── app.module.ts        ← Módulo raíz
    ├── config/              ← Configuración (DB, etc.)
    ├── [dominio]/           ← Lógica del dominio
    │   ├── [dominio].module.ts
    │   ├── [dominio].controller.ts
    │   ├── [dominio].service.ts
    │   ├── dto/             ← Data Transfer Objects
    │   ├── entities/        ← Entidades TypeORM
    │   └── internal/        ← Endpoints service-to-service
    ├── events/              ← Suscriptores de eventos RabbitMQ
    └── health/              ← Health check endpoint
```

Consulta el README.md dentro de cada servicio para ver su estructura específica.
