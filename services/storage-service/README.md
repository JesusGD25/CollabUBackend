# Storage Service

Servicio de almacenamiento y gestión de archivos para la plataforma **Collab-U** de la Universidad de Nariño. Gestiona la subida, descarga, versionado y cuotas de archivos. Soporta múltiples categorías de archivos con validaciones de MIME type, tamaño y extensiones bloqueadas.

## Información General

| Campo | Valor |
|-------|-------|
| **Puerto** | `3013` |
| **Base de datos** | `storage_db` (PostgreSQL 15) |
| **Framework** | NestJS 11 |
| **ORM** | TypeORM 0.3 |
| **Mensajería** | RabbitMQ (vía `@collab-u/shared`) |
| **Swagger** | `http://localhost:3013/api/docs` |
| **Health Check** | `GET http://localhost:3013/health` |

## Arquitectura

```
src/
├── storage/
│   ├── dto/                              # Data Transfer Objects
│   │   ├── upload-file.dto.ts
│   │   ├── file-response.dto.ts
│   │   ├── file-query.dto.ts
│   │   └── quota-response.dto.ts
│   ├── entities/                         # Entidades TypeORM
│   │   ├── stored-file.entity.ts
│   │   ├── file-version.entity.ts
│   │   └── storage-quota.entity.ts
│   ├── storage.controller.ts             # Endpoints públicos (8 rutas)
│   ├── storage-internal.controller.ts    # Endpoints inter-servicio
│   ├── storage.service.ts               # Lógica de negocio
│   └── storage.module.ts
├── events/
│   └── storage-events.subscriber.ts     # Suscriptor RabbitMQ
├── config/
│   ├── database.config.ts              # Configuración TypeORM → storage_db
│   └── multer.config.ts               # Configuración Multer (diskStorage)
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Entidades de Base de Datos

### `stored_files`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador del archivo |
| `owner_id` | UUID | ID del usuario propietario |
| `original_name` | VARCHAR(255) | Nombre original del archivo |
| `stored_name` | VARCHAR(255) | Nombre en disco (UUID + extensión) |
| `mime_type` | VARCHAR(100) | Tipo MIME del archivo |
| `size` | BIGINT | Tamaño en bytes |
| `category` | ENUM | Categoría del archivo (ver abajo) |
| `entity_type` | VARCHAR(100) | Tipo de entidad asociada (nullable) |
| `entity_id` | UUID | ID de la entidad asociada (nullable) |
| `is_public` | BOOLEAN | Acceso público (default: false) |
| `status` | ENUM | `uploading`, `active`, `archived`, `deleted` |
| `checksum` | VARCHAR(64) | Hash SHA-256 del archivo |
| `current_version` | INTEGER | Versión actual (default: 1) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |
| `deleted_at` | TIMESTAMPTZ | Fecha de borrado lógico (nullable) |

**Categorías:** `avatar`, `cv`, `portfolio`, `deliverable`, `company_logo`, `company_document`, `chat_attachment`, `report`, `other`

**Estados:** `uploading`, `active`, `archived`, `deleted`

**Índices:** `owner_id`, `category`, `(entity_type, entity_id)`, `status`

### `file_versions`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `file_id` | UUID (FK → stored_files) | Referencia al archivo |
| `version_number` | INTEGER | Número de versión |
| `stored_name` | VARCHAR(255) | Nombre en disco |
| `mime_type` | VARCHAR(100) | Tipo MIME |
| `size` | BIGINT | Tamaño en bytes |
| `checksum` | VARCHAR(64) | Hash SHA-256 |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Índices:** Unique constraint en `(file_id, version_number)`  
**Relaciones:** ManyToOne → `stored_files` (CASCADE delete)

### `storage_quotas`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `user_id` | UUID UNIQUE | ID del usuario |
| `max_storage_bytes` | BIGINT | Cuota máxima (depende del rol) |
| `used_storage_bytes` | BIGINT | Espacio utilizado (default: 0) |
| `max_file_size_bytes` | BIGINT | Tamaño máximo por archivo (default: 10 MB) |
| `max_files` | INTEGER | Máximo de archivos (default: 100) |
| `total_files` | INTEGER | Total de archivos actuales (default: 0) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

## Validaciones de Archivos

### Por Categoría (MIME types y tamaño máximo)

| Categoría | MIME Types Permitidos | Tamaño Máximo |
|-----------|----------------------|---------------|
| `cv` | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 10 MB |
| `avatar` | `image/jpeg`, `image/png`, `image/webp` | 5 MB |
| `deliverable` | `application/pdf`, `msword`, `docx`, `zip`, `x-rar-compressed`, `gzip` | 50 MB |
| `report` | `application/pdf`, `msword`, `docx`, `xls`, `xlsx`, `ppt`, `pptx` | 25 MB |

### Extensiones Bloqueadas

`.exe`, `.bat`, `.sh`, `.cmd`, `.com`, `.msi`, `.ps1`

### Cuotas por Rol

| Rol | Cuota de Almacenamiento |
|-----|------------------------|
| `student` | 500 MB |
| `company` | 2 GB |
| `faculty` | 1 GB |
| `admin` | 5 GB |

## Endpoints API

### Protegidos (`/api/v1/storage`) — requieren Bearer Token

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `POST` | `/upload` | Subir archivo (multipart/form-data, campo: `file`) | 201 |
| `GET` | `/files` | Listar mis archivos (paginado, filtros) | 200 |
| `GET` | `/files/:fileId` | Información del archivo con versiones | 200 |
| `GET` | `/files/:fileId/download` | Descargar archivo (stream binario) | 200 |
| `DELETE` | `/files/:fileId` | Eliminar archivo (soft delete) | 204 |
| `POST` | `/files/:fileId/versions` | Subir nueva versión | 201 |
| `GET` | `/quota` | Obtener uso de cuota | 200 |
| `POST` | `/files/:fileId/signed-url` | Generar URL firmada temporal | 201 |

### Internos (`/internal/storage`) — Sin autenticación, solo inter-servicio

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/files/:fileId/verify` | Verificar existencia y propiedad (`?ownerId=`) |
| `POST` | `/cleanup` | Limpiar archivos huérfanos (`{ olderThanDays, category? }`) |

## Almacenamiento en Disco (Multer)

| Configuración | Valor |
|---------------|-------|
| **Estrategia** | `diskStorage` |
| **Directorio** | Variable `UPLOAD_DIR` (default: `{cwd}/uploads`) |
| **Nombres** | UUID v4 + extensión original |
| **Límite global** | 50 MB |
| **Auto-creación** | Crea directorio si no existe |

## URL Firmada (Signed URL)

Se genera una URL firmada temporal usando HMAC SHA-256:

| Campo | Descripción |
|-------|-------------|
| `expiresInMinutes` | Duración de la URL (default: 60 min) |
| `signature` | HMAC SHA-256 del fileId + expires |
| `expires` | Timestamp UNIX de expiración |

## Eventos RabbitMQ

### Suscritos

| Evento | Cola | Acción |
|--------|------|--------|
| `auth.user.created` | `storage-service.auth.user.created` | Inicializa cuota de almacenamiento según rol |

### Publicados

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `storage.file.uploaded` | `{ fileId, ownerId, category, size }` | Al subir archivo |
| `storage.file.deleted` | `{ fileId, ownerId }` | Al eliminar archivo |

## Paginación (Listado de Archivos)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `category` | FileCategory (enum) | — | Filtrar por categoría |
| `entityType` | string | — | Filtrar por tipo de entidad |
| `entityId` | UUID | — | Filtrar por entidad |
| `page` | integer (≥1) | `1` | Página actual |
| `limit` | integer (1-50) | `20` | Resultados por página |

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3013` | Puerto del servicio |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5435` | Puerto PostgreSQL |
| `DATABASE_USER` | `collabu_admin` | Usuario DB |
| `DATABASE_PASSWORD` | `collabu_secret_2025` | Contraseña DB |
| `DATABASE_NAME` | `storage_db` | Nombre de la base de datos |
| `NODE_ENV` | `development` | Entorno |
| `RABBITMQ_URL` | `amqp://admin:admin@localhost:5672` | URL de RabbitMQ |
| `UPLOAD_DIR` | `{cwd}/uploads` | Directorio de almacenamiento |
| `SIGNED_URL_SECRET` | *(hardcoded para dev)* | Secreto para URLs firmadas |

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
| `multer` | ^1.4.5 | Manejo de uploads multipart |
| `uuid` | ^13.x | Generación de identificadores |

## Flujos Principales

### Subida de Archivo
1. Usuario envía `POST /api/v1/storage/upload` con archivo multipart
2. Multer almacena en disco con nombre UUID
3. Validación: extensión no bloqueada → MIME type por categoría → tamaño por categoría → cuota de usuario
4. Se calcula checksum SHA-256
5. Se crea registro `StoredFile` + `FileVersion` (v1)
6. Se actualiza cuota del usuario
7. Se publica evento `storage.file.uploaded`

### Versionado de Archivo
1. Usuario envía `POST /api/v1/storage/files/:fileId/versions` con nuevo archivo
2. Valida propiedad del archivo
3. Incrementa `current_version`
4. Crea nuevo `FileVersion`
5. Actualiza tamaño y checksum en `StoredFile`
6. Ajusta cuota del usuario (diferencia de tamaños)

### Eliminación (Soft Delete)
1. Usuario envía `DELETE /api/v1/storage/files/:fileId`
2. Valida propiedad
3. Marca como `status: 'deleted'`, registra `deleted_at`
4. Deduce tamaño de la cuota
5. Publica evento `storage.file.deleted`

### Inicialización de Cuota (Event-Driven)
1. Auth Service publica `auth.user.created` con `{ userId, role }`
2. `StorageEventsSubscriber` recibe el evento
3. Crea `StorageQuota` con cuota según rol (student: 500MB, company: 2GB, faculty: 1GB, admin: 5GB)
