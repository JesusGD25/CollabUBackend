# Auth Service

Servicio de autenticación y autorización para la plataforma **Collab-U** de la Universidad de Nariño. Gestiona el registro de usuarios, inicio de sesión con JWT, verificación de email, restablecimiento de contraseña, refresh token rotation y validación de tokens para el API Gateway.

## Información General

| Campo | Valor |
|-------|-------|
| **Puerto** | `3001` |
| **Base de datos** | `auth_db` (PostgreSQL 15) |
| **Framework** | NestJS 11 |
| **ORM** | TypeORM 0.3 |
| **Mensajería** | RabbitMQ (vía `@collab-u/shared`) |
| **Swagger** | `http://localhost:3001/api/docs` |
| **Health Check** | `GET http://localhost:3001/health` |

## Arquitectura

```
src/
├── auth/
│   ├── dto/                  # Data Transfer Objects con validación
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   ├── verify-email.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   ├── reset-password.dto.ts
│   │   ├── change-password.dto.ts
│   │   └── auth-response.dto.ts
│   ├── entities/             # Entidades TypeORM
│   │   ├── user.entity.ts
│   │   ├── refresh-token.entity.ts
│   │   └── verification-token.entity.ts
│   ├── internal/             # Endpoints inter-servicio (sin auth)
│   │   └── auth-internal.controller.ts
│   ├── strategies/           # Passport.js strategies
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── auth.controller.ts    # Endpoints públicos/protegidos
│   ├── auth.service.ts       # Lógica de negocio
│   └── auth.module.ts
├── config/
│   └── database.config.ts    # Configuración TypeORM → auth_db
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Entidades de Base de Datos

### `users`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `email` | VARCHAR(255) UNIQUE | Email del usuario |
| `password_hash` | VARCHAR(255) | Hash bcrypt (salt rounds: 12) |
| `role` | ENUM | `student`, `company`, `admin`, `faculty` |
| `is_verified` | BOOLEAN | Email verificado (default: `false`) |
| `is_active` | BOOLEAN | Cuenta activa (default: `true`) |
| `failed_login_attempts` | INTEGER | Intentos fallidos (default: `0`) |
| `locked_until` | TIMESTAMPTZ | Fecha de desbloqueo (nullable) |
| `last_login` | TIMESTAMPTZ | Último inicio de sesión |
| `password_changed_at` | TIMESTAMPTZ | Último cambio de contraseña |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**Índices:** `idx_users_role_active` (role, is_active)

### `refresh_tokens`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → users) | Referencia al usuario |
| `token` | VARCHAR(512) UNIQUE | Token UUID |
| `device_info` | VARCHAR(500) | Información del dispositivo (nullable) |
| `ip_address` | VARCHAR(45) | Dirección IP (nullable) |
| `expires_at` | TIMESTAMPTZ | Fecha de expiración (7 días) |
| `revoked` | BOOLEAN | Si fue revocado (default: `false`) |
| `revoked_at` | TIMESTAMPTZ | Cuándo fue revocado |
| `replaced_by_token` | VARCHAR(512) | Token de reemplazo (rotation) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Índices:** `idx_refresh_tokens_user_revoked` (user_id, revoked)

### `verification_tokens`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK → users) | Referencia al usuario |
| `token` | VARCHAR(255) UNIQUE | Token UUID |
| `type` | ENUM | `email_verification`, `password_reset` |
| `expires_at` | TIMESTAMPTZ | Expiración (24h email, 1h reset) |
| `used` | BOOLEAN | Si ya fue utilizado (default: `false`) |
| `used_at` | TIMESTAMPTZ | Cuándo fue utilizado |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Índices:** `idx_verification_tokens_user_type` (user_id, type, used)

## Endpoints API

### Públicos (`/api/v1/auth`)

| Método | Ruta | Descripción | Código Éxito |
|--------|------|-------------|--------------|
| `POST` | `/register` | Registrar nuevo usuario | 201 |
| `POST` | `/login` | Iniciar sesión | 200 |
| `POST` | `/refresh` | Renovar tokens con refresh token | 200 |
| `POST` | `/verify-email` | Verificar email con token | 200 |
| `POST` | `/forgot-password` | Solicitar reset de contraseña | 200 |
| `POST` | `/reset-password` | Restablecer contraseña con token | 200 |
| `POST` | `/validate` | Validar token JWT (uso gateway) | 200 |

### Protegidos (requieren Bearer Token)

| Método | Ruta | Descripción | Código Éxito |
|--------|------|-------------|--------------|
| `POST` | `/logout` | Cerrar sesión (revocar refresh) | 200 |
| `POST` | `/logout-all` | Cerrar todas las sesiones | 200 |
| `POST` | `/change-password` | Cambiar contraseña | 200 |

### Internos (`/internal/auth`) — Sin autenticación, solo inter-servicio

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/validate` | Validar token JWT |
| `GET` | `/users/:id` | Obtener datos básicos del usuario |
| `GET` | `/users/:id/role` | Obtener rol del usuario |

## Seguridad

### Contraseñas
- **Hashing:** bcrypt con 12 salt rounds
- **Validación:** Mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial (`@$!%*?&#+\-_.`)
- **Máximo:** 128 caracteres

### Bloqueo de Cuenta
- **Intentos máximos:** 5 intentos fallidos
- **Duración bloqueo:** 30 minutos
- **Reset:** Automático tras login exitoso

### JWT
- **Algoritmo:** HS256
- **Expiración access token:** 1 hora (3600 segundos)
- **Expiración refresh token:** 7 días
- **Payload:** `{ sub: userId, email, role, iat, exp }`
- **Secret:** Variable de entorno `JWT_SECRET`

### Refresh Token Rotation
Cada vez que se usa un refresh token, se revoca el anterior y se genera uno nuevo. Si un token revocado se reutiliza, se puede detectar compromiso de la cadena.

### Verificación de Email
- Token UUID válido por 24 horas
- Se envía evento `auth.user.verified` al verificar

### Restablecimiento de Contraseña
- Token UUID válido por 1 hora
- Al restablecer, se revocan todos los refresh tokens del usuario

## Eventos RabbitMQ

### Publicados

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `auth.user.created` | `{ userId, email, role }` | Al registrar usuario |
| `auth.user.verified` | `{ userId }` | Al verificar email |

## Validación de DTOs

Todos los endpoints usan `ValidationPipe` global con:
- `whitelist: true` — elimina propiedades no declaradas en el DTO
- `forbidNonWhitelisted: true` — lanza error si se envían propiedades extras
- `transform: true` — transforma automáticamente los tipos

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3001` | Puerto del servicio |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5435` | Puerto PostgreSQL |
| `DATABASE_USER` | `collabu_admin` | Usuario DB |
| `DATABASE_PASSWORD` | `collabu_secret_2025` | Contraseña DB |
| `DATABASE_NAME` | `auth_db` | Nombre de la base de datos |
| `JWT_SECRET` | *(hardcoded para dev)* | Secreto JWT |
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
| `@nestjs/jwt` | ^11.0.2 | Generación y verificación JWT |
| `@nestjs/passport` | ^11.0.5 | Integración Passport.js |
| `passport-jwt` | ^4.0.1 | Estrategia JWT para Passport |
| `passport-local` | ^1.0.0 | Estrategia local (email/password) |
| `bcrypt` | ^6.0.0 | Hashing de contraseñas |
| `typeorm` | ^0.3.28 | ORM para PostgreSQL |
| `@collab-u/shared` | local | RabbitMQModule, EventPublisher, filtros globales |

## Flujos Principales

### Registro
1. Validar que el email no exista
2. Hash de la contraseña con bcrypt (12 rounds)
3. Crear registro en `users`
4. Generar token de verificación (24h)
5. Publicar evento `auth.user.created` → User Service crea perfil automáticamente

### Login
1. Buscar usuario por email
2. Verificar que no esté bloqueado ni desactivado
3. Comparar contraseña con hash
4. Si falla: incrementar intentos (bloquear a los 5)
5. Si éxito: resetear intentos, generar JWT + refresh token
6. Retornar: `{ accessToken, refreshToken, user, expiresIn }`

### Refresh Token
1. Buscar refresh token no revocado y no expirado
2. Verificar que el usuario esté activo
3. Revocar token actual, vincular con `replaced_by_token`
4. Generar nuevo access token + refresh token
