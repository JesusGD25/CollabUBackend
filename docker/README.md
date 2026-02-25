# docker/

Configuración de Docker, orquestación de contenedores y despliegue.

## Estructura Interna

```
docker/
├── docker-compose.yml          ← Composición completa (18 contenedores)
├── docker-compose.dev.yml      ← Override para desarrollo (hot-reload, puertos expuestos)
├── docker-compose.prod.yml     ← Override para producción
├── init-databases.sql          ← Script que crea las 13 bases de datos al iniciar PostgreSQL
├── nginx/
│   ├── nginx.conf              ← Reverse proxy: rutea /api/* al gateway, /* al frontend
│   └── ssl/                    ← Certificados SSL (solo producción)
└── rabbitmq/
    └── rabbitmq.conf           ← Configuración custom de RabbitMQ
```

## Contenedores

El docker-compose levanta 18 contenedores:

| Contenedor | Imagen/Build | Puerto Externo |
|-----------|-------------|----------------|
| nginx | nginx:alpine | 80, 443 |
| postgres | postgres:15-alpine | 5432 |
| redis | redis:7-alpine | 6379 |
| rabbitmq | rabbitmq:3.12-management | 5672, 15672 |
| api-gateway | Build local | 3000 |
| auth-service | Build local | 3001 |
| user-service | Build local | 3002 |
| student-service | Build local | 3003 |
| company-service | Build local | 3004 |
| project-service | Build local | 3005 |
| application-service | Build local | 3006 |
| matching-service | Build local | 3007 |
| evaluation-service | Build local | 3008 |
| notification-service | Build local | 3009 |
| chat-service | Build local | 3010 |
| admin-service | Build local | 3011 |
| analytics-service | Build local | 3012 |
| storage-service | Build local | 3013 |
