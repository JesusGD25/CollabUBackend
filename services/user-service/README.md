# User Service

Servicio de gestión de perfiles de usuario, configuración personal y registro de actividad para la plataforma **Collab-U** de la Universidad de Nariño. Se integra con el Auth Service mediante eventos RabbitMQ para la creación automática de perfiles.

## Información General

| Campo | Valor |
|-------|-------|
| **Puerto** | `3002` |
| **Base de datos** | `user_db` (PostgreSQL 15) |
| **Framework** | NestJS 11 |
| **ORM** | TypeORM 0.3 |
| **Mensajería** | RabbitMQ (vía `@collab-u/shared`) |
| **Swagger** | `http://localhost:3002/api/docs` |
| **Health Check** | `GET http://localhost:3002/health` |

## Arquitectura

```
src/
├── users/
│   ├── dto/                        # Data Transfer Objects
│   │   ├── create-user-profile.dto.ts
│   │   ├── update-user-profile.dto.ts
│   │   ├── update-user-settings.dto.ts
│   │   ├── user-profile-response.dto.ts
│   │   ├── activity-log-query.dto.ts
│   │   └── activity-log-response.dto.ts
│   ├── entities/                   # Entidades TypeORM
│   │   ├── user-profile.entity.ts
│   │   ├── user-settings.entity.ts
│   │   └── activity-log.entity.ts
│   ├── internal/                   # Endpoints inter-servicio
│   │   └── users-internal.controller.ts
│   ├── users.controller.ts         # Endpoints protegidos
│   ├── users.service.ts            # Lógica de negocio
│   └── users.module.ts
├── events/
│   └── user-events.subscriber.ts   # Suscriptor RabbitMQ
├── config/
│   └── database.config.ts          # Configuración TypeORM → user_db
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Entidades de Base de Datos

### `user_profiles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador del perfil |
| `user_id` | UUID UNIQUE | ID del usuario (de Auth Service) |
| `role` | VARCHAR(50) | Rol referencia (`student`, `company`, etc.) |
| `first_name` | VARCHAR(100) | Nombre |
| `last_name` | VARCHAR(100) | Apellido |
| `phone` | VARCHAR(20) | Teléfono (nullable) |
| `phone_country_code` | VARCHAR(5) | Código de país (nullable) |
| `avatar_url` | VARCHAR(500) | URL del avatar (nullable) |
| `date_of_birth` | DATE | Fecha de nacimiento (nullable) |
| `gender` | VARCHAR(20) | Género (nullable) |
| `bio` | TEXT | Biografía (nullable) |
| `city` | VARCHAR(100) | Ciudad (nullable) |
| `department` | VARCHAR(100) | Departamento (nullable) |
| `country` | VARCHAR(100) | País (default: `Colombia`) |
| `address` | VARCHAR(255) | Dirección (nullable) |
| `website_url` | VARCHAR(500) | Sitio web (nullable) |
| `linkedin_url` | VARCHAR(500) | LinkedIn (nullable) |
| `profile_completeness` | INTEGER | % completitud (0-100) |
| `is_onboarding_complete` | BOOLEAN | Onboarding completado (default: `false`) |
| `last_active_at` | TIMESTAMPTZ | Última actividad |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**Índices:** `idx_user_profiles_first_last` (first_name, last_name)  
**Relaciones:** OneToOne → `user_settings`

### `user_settings`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `user_id` | UUID UNIQUE (FK → user_profiles.user_id) | Referencia al perfil |
| `theme` | ENUM | `light`, `dark`, `system` (default: `system`) |
| `language` | ENUM | `es`, `en` (default: `es`) |
| `profile_visibility` | ENUM | `public`, `registered`, `private` (default: `registered`) |
| `email_notifications` | BOOLEAN | Notificaciones email (default: `true`) |
| `push_notifications` | BOOLEAN | Notificaciones push (default: `true`) |
| `application_updates` | BOOLEAN | Actualizaciones aplics. (default: `true`) |
| `new_matches` | BOOLEAN | Nuevos matches (default: `true`) |
| `messages` | BOOLEAN | Mensajes (default: `true`) |
| `evaluation_reminders` | BOOLEAN | Recordatorios evaluación (default: `true`) |
| `marketing_emails` | BOOLEAN | Emails marketing (default: `false`) |
| `timezone` | VARCHAR(50) | Zona horaria (default: `America/Bogota`) |
| `date_format` | VARCHAR(20) | Formato fecha (default: `DD/MM/YYYY`) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

### `activity_log`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `user_id` | UUID | ID del usuario |
| `activity_type` | ENUM | Tipo de actividad (ver abajo) |
| `description` | VARCHAR(500) | Descripción (nullable) |
| `metadata` | JSONB | Datos adicionales (nullable) |
| `ip_address` | VARCHAR(45) | IP del cliente (nullable) |
| `user_agent` | VARCHAR(500) | User-Agent (nullable) |
| `created_at` | TIMESTAMPTZ | Timestamp del evento |

**Índices:** `idx_activity_log_user_created` (user_id, created_at)

**Tipos de actividad:**  
`login`, `logout`, `profile_updated`, `avatar_changed`, `settings_changed`, `password_changed`, `email_verified`, `account_deactivated`, `account_reactivated`

## Endpoints API

### Protegidos (`/api/v1/users`) — requieren Bearer Token

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `POST` | `/profile` | Crear perfil de usuario | 201 |
| `GET` | `/profile` | Obtener mi perfil (con settings) | 200 |
| `GET` | `/profile/:userId` | Ver perfil de otro usuario | 200 |
| `PATCH` | `/profile` | Actualizar mi perfil | 200 |
| `POST` | `/profile/avatar` | Subir avatar (TODO: Storage) | 200 |
| `DELETE` | `/profile/avatar` | Eliminar avatar | 200 |
| `GET` | `/settings` | Obtener mi configuración | 200 |
| `PATCH` | `/settings` | Actualizar configuración | 200 |
| `GET` | `/activity` | Historial de actividad (paginado) | 200 |

**Autenticación:** Todos los endpoints usan `JwtAuthGuard` de `@collab-u/shared`, que lee los headers `x-user-id`, `x-user-email`, `x-user-role` inyectados por el API Gateway.

### Internos (`/internal/users`) — Sin autenticación, solo inter-servicio

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/profile/:userId/basic` | Perfil básico (userId, nombre, avatar) |
| `POST` | `/batch-basic` | Perfiles básicos en batch `{ userIds: [] }` |

## Cálculo de Completitud del Perfil

El `profileCompleteness` (0-100%) se calcula automáticamente al crear o actualizar el perfil, evaluando los siguientes 11 campos:

| # | Campo |
|---|-------|
| 1 | `firstName` |
| 2 | `lastName` |
| 3 | `phone` |
| 4 | `dateOfBirth` |
| 5 | `gender` |
| 6 | `bio` |
| 7 | `city` |
| 8 | `department` |
| 9 | `avatarUrl` |
| 10 | `websiteUrl` |
| 11 | `linkedinUrl` |

**Fórmula:** `Math.round((camposLlenos / 11) * 100)`

## Eventos RabbitMQ

### Suscritos

| Evento | Cola | Acción |
|--------|------|--------|
| `auth.user.created` | `user-service.auth.user.created` | Crea perfil base automático + settings por defecto |

### Publicados

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `user.profile.updated` | `{ userId, profileCompleteness }` | Al actualizar perfil |

## Paginación (Activity Log)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `activityType` | ActivityType (enum) | — | Filtrar por tipo |
| `startDate` | ISO 8601 string | — | Desde fecha |
| `endDate` | ISO 8601 string | — | Hasta fecha |
| `page` | integer (≥1) | `1` | Página actual |
| `limit` | integer (1-100) | `20` | Resultados por página |

**Respuesta paginada:**
```json
{
  "data": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3002` | Puerto del servicio |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5435` | Puerto PostgreSQL |
| `DATABASE_USER` | `collabu_admin` | Usuario DB |
| `DATABASE_PASSWORD` | `collabu_secret_2025` | Contraseña DB |
| `DATABASE_NAME` | `user_db` | Nombre de la base de datos |
| `NODE_ENV` | `development` | Entorno |
| `RABBITMQ_URL` | `amqp://admin:admin@localhost:5672` | URL de RabbitMQ |

## Ejecución

```bash
# Desarrollo (hot-reload)
npm run start:dev

# Producción
npm run build
npm run start:prod

# Tests
npm run test              # Unit tests
npm run test:cov          # Con cobertura
npm run test:e2e          # E2E tests
```

## Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `typeorm` | ^0.3.28 | ORM para PostgreSQL |
| `@collab-u/shared` | local | RabbitMQModule, EventPublisher, EventSubscriber, JwtAuthGuard, filtros |
| `class-validator` | ^0.14.4 | Validación de DTOs |
| `class-transformer` | ^0.5.1 | Transformación de respuestas |

## Flujos Principales

### Creación Automática de Perfil (Event-Driven)
1. Auth Service publica `auth.user.created` con `{ userId, email, role }`
2. `UserEventsSubscriber` recibe el evento
3. Llama a `usersService.createProfile({ userId, role, firstName: '', lastName: '' })`
4. Se crea perfil base + settings por defecto (tema: system, idioma: es, timezone: America/Bogota)

### Actualización de Perfil
1. Usuario envía `PATCH /api/v1/users/profile` con campos a actualizar
2. Se mezclan campos nuevos con existentes (`Object.assign`)
3. Se recalcula `profileCompleteness`
4. Se registra actividad `profile_updated`
5. Se publica evento `user.profile.updated` con `{ userId, profileCompleteness }`
