# Collab-U — Backend

Plataforma web que conecta estudiantes de la Universidad de Nariño con empresas para prácticas profesionales, servicio social, investigación y pasantías.

## Arquitectura

Backend basado en **14 microservicios** con NestJS (TypeScript), comunicación síncrona vía HTTP y asíncrona vía RabbitMQ.

## Stack Tecnológico

| Tecnología | Uso |
|-----------|-----|
| NestJS 10+ | Framework de cada microservicio |
| TypeScript 5+ | Lenguaje base |
| PostgreSQL 15+ | Base de datos (1 contenedor, 13 bases separadas) |
| TypeORM 0.3+ | ORM para acceso a datos |
| RabbitMQ 3.12+ | Mensajería asíncrona entre servicios |
| Redis 7+ | Cache y gestión de sesiones |
| Passport.js + JWT | Autenticación |
| Socket.IO | WebSocket para chat y notificaciones en tiempo real |
| Docker + Docker Compose | Contenedorización |

## Estructura General

```
Backend/
├── README.md                ← Este archivo
│
├── shared/                  ← Librería compartida entre todos los servicios
│   └── src/
│       ├── dto/             ← DTOs reutilizables (paginación, respuesta estándar)
│       ├── interfaces/      ← Interfaces compartidas (eventos, respuestas)
│       ├── guards/          ← Guards de autenticación y autorización
│       ├── decorators/      ← Decoradores custom (@Roles, @CurrentUser)
│       ├── filters/         ← Filtros de excepción globales
│       ├── interceptors/    ← Interceptores (transform, logging)
│       ├── rabbitmq/        ← Módulo de conexión y pub/sub con RabbitMQ
│       ├── http-client/     ← Cliente HTTP para comunicación entre servicios
│       ├── resilience/      ← Circuit Breaker y retry
│       └── constants/       ← Enums, routing keys y códigos de error
│
├── services/                ← Los 14 microservicios
│   ├── api-gateway/         ← Puerto 3000 — Punto de entrada único
│   ├── auth-service/        ← Puerto 3001 — Autenticación y JWT
│   ├── user-service/        ← Puerto 3002 — Perfiles de usuario
│   ├── student-service/     ← Puerto 3003 — Perfiles de estudiante
│   ├── company-service/     ← Puerto 3004 — Perfiles de empresa
│   ├── project-service/     ← Puerto 3005 — Gestión de proyectos
│   ├── application-service/ ← Puerto 3006 — Aplicaciones a proyectos
│   ├── matching-service/    ← Puerto 3007 — Algoritmo de matching
│   ├── evaluation-service/  ← Puerto 3008 — Evaluaciones
│   ├── notification-service/← Puerto 3009 — Notificaciones y email
│   ├── chat-service/        ← Puerto 3010 — Mensajería en tiempo real
│   ├── admin-service/       ← Puerto 3011 — Administración
│   ├── analytics-service/   ← Puerto 3012 — Métricas y reportes
│   └── storage-service/     ← Puerto 3013 — Almacenamiento de archivos
│
└── docker/                  ← Configuración de Docker y despliegue
    ├── docker-compose.yml
    ├── docker-compose.dev.yml
    ├── init-databases.sql
    ├── nginx/               ← Reverse proxy
    └── rabbitmq/            ← Config custom de RabbitMQ
```

## Bases de Datos

Se utiliza **1 contenedor de PostgreSQL** con **13 bases de datos separadas** (una por servicio que persiste datos):

| Servicio | Base de Datos | Puerto del Servicio |
|----------|--------------|-------------------|
| auth-service | auth_db | 3001 |
| user-service | user_db | 3002 |
| student-service | student_db | 3003 |
| company-service | company_db | 3004 |
| project-service | project_db | 3005 |
| application-service | application_db | 3006 |
| matching-service | matching_db | 3007 |
| evaluation-service | evaluation_db | 3008 |
| notification-service | notification_db | 3009 |
| chat-service | chat_db | 3010 |
| admin-service | admin_db | 3011 |
| analytics-service | analytics_db | 3012 |
| storage-service | storage_db | 3013 |

> El API Gateway (puerto 3000) no tiene base de datos propia; actúa como proxy.

## Comunicación entre Servicios

- **Síncrona (HTTP):** El API Gateway reenvía las peticiones al servicio correspondiente. Los servicios también se comunican entre sí vía HTTP interno cuando necesitan datos de otro servicio.
- **Asíncrona (RabbitMQ):** Los servicios publican eventos de dominio (ej. `application.created`) y otros servicios suscritos reaccionan (ej. notification-service crea una notificación).

## Documentación de planificación

Toda la especificación detallada (modelos de datos, endpoints, eventos, algoritmos) se encuentra en la carpeta `Plan de trabajo v2/` en la raíz del proyecto.
