# Student Service

Servicio de gestión de perfiles de estudiantes para la plataforma **Collab-U** de la Universidad de Nariño. Permite a los estudiantes construir su perfil académico, habilidades, experiencias, certificaciones, idiomas e intereses. Se integra con el Auth Service mediante eventos RabbitMQ para la creación automática de perfiles base.

## Información General

| Campo | Valor |
|-------|-------|
| **Puerto** | `3003` |
| **Base de datos** | `student_db` (PostgreSQL 15) |
| **Framework** | NestJS 11 |
| **ORM** | TypeORM 0.3 |
| **Mensajería** | RabbitMQ (vía `@collab-u/shared`) |
| **Swagger** | `http://localhost:3003/api/docs` |
| **Health Check** | `GET http://localhost:3003/health` |

## Arquitectura

```
src/
├── student/
│   ├── dto/                              # Data Transfer Objects (17 archivos)
│   │   ├── create-student-profile.dto.ts
│   │   ├── update-student-profile.dto.ts
│   │   ├── student-profile-response.dto.ts
│   │   ├── student-search-query.dto.ts
│   │   ├── paginated-students-response.dto.ts
│   │   ├── create-skill.dto.ts
│   │   ├── update-skill.dto.ts
│   │   ├── create-experience.dto.ts
│   │   ├── update-experience.dto.ts
│   │   ├── create-education.dto.ts
│   │   ├── update-education.dto.ts
│   │   ├── create-certification.dto.ts
│   │   ├── update-certification.dto.ts
│   │   ├── create-language.dto.ts
│   │   ├── update-language.dto.ts
│   │   ├── create-interest.dto.ts
│   │   └── update-interest.dto.ts
│   ├── entities/                         # Entidades TypeORM (7)
│   │   ├── student-profile.entity.ts
│   │   ├── skill.entity.ts
│   │   ├── experience.entity.ts
│   │   ├── education.entity.ts
│   │   ├── certification.entity.ts
│   │   ├── language.entity.ts
│   │   └── interest.entity.ts
│   ├── student.controller.ts             # Endpoints públicos (30 rutas)
│   ├── student-internal.controller.ts    # Endpoints inter-servicio
│   ├── student.service.ts               # Lógica de negocio
│   └── student.module.ts
├── events/
│   └── student-events.subscriber.ts     # Suscriptor RabbitMQ
├── config/
│   └── database.config.ts              # Configuración TypeORM → student_db
├── health/
│   └── health.controller.ts
├── app.module.ts
└── main.ts
```

## Entidades de Base de Datos

### `student_profiles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador del perfil |
| `user_id` | UUID UNIQUE | ID del usuario (de Auth Service) |
| `program` | VARCHAR(200) | Programa académico |
| `semester` | INTEGER | Semestre actual (1-12) |
| `student_code` | VARCHAR(50) | Código estudiantil (nullable) |
| `faculty` | VARCHAR(200) | Facultad (nullable) |
| `university` | VARCHAR(200) | Universidad (default: Universidad de Nariño) |
| `bio` | TEXT | Biografía (nullable) |
| `cv_url` | VARCHAR(500) | URL del CV (nullable) |
| `portfolio_url` | VARCHAR(500) | URL del portafolio (nullable) |
| `gpa` | DECIMAL(3,2) | Promedio acumulado (nullable) |
| `availability` | ENUM | `full_time`, `part_time`, `flexible`, `not_available` |
| `preferred_work_mode` | ENUM | `remote`, `on_site`, `hybrid`, `any` |
| `available_hours_per_week` | INTEGER | Horas disponibles por semana (nullable) |
| `average_rating` | DECIMAL(3,2) | Calificación promedio (default: 0) |
| `total_ratings` | INTEGER | Total de evaluaciones recibidas (default: 0) |
| `profile_completeness` | INTEGER | % completitud (0-100) |
| `is_visible` | BOOLEAN | Visible en búsquedas (default: true) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**Relaciones:** OneToMany → `skills`, `experiences`, `education`, `certifications`, `languages`, `interests`

### `skills`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `student_id` | UUID (FK → student_profiles) | Referencia al perfil |
| `name` | VARCHAR(100) | Nombre de la habilidad |
| `category` | ENUM | `technical`, `soft`, `language`, `tool` |
| `proficiency_level` | ENUM | `beginner`, `intermediate`, `advanced`, `expert` |
| `years_of_experience` | INTEGER | Años de experiencia (nullable) |

**Índices:** Unique constraint en `(student_id, name)`

### `experiences`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `student_id` | UUID (FK) | Referencia al perfil |
| `type` | ENUM | `professional`, `academic`, `volunteer`, `personal_project` |
| `title` | VARCHAR(200) | Título del cargo/proyecto |
| `organization` | VARCHAR(200) | Organización |
| `description` | TEXT | Descripción (nullable) |
| `start_date` | DATE | Fecha de inicio |
| `end_date` | DATE | Fecha de fin (nullable) |
| `is_current` | BOOLEAN | Es actual (default: false) |
| `achievements` | TEXT[] | Logros |
| `technologies_used` | TEXT[] | Tecnologías utilizadas |

### `education`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `student_id` | UUID (FK) | Referencia al perfil |
| `institution` | VARCHAR(200) | Institución |
| `degree` | VARCHAR(200) | Título obtenido |
| `field_of_study` | VARCHAR(200) | Área de estudio |
| `start_date` | DATE | Fecha de inicio |
| `end_date` | DATE | Fecha de fin (nullable) |
| `is_current` | BOOLEAN | En curso (default: false) |
| `gpa` | DECIMAL(3,2) | Promedio (nullable) |
| `achievements` | TEXT[] | Logros |
| `thesis_title` | VARCHAR(500) | Título de tesis (nullable) |

### `certifications`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `student_id` | UUID (FK) | Referencia al perfil |
| `name` | VARCHAR(200) | Nombre de la certificación |
| `issuing_organization` | VARCHAR(200) | Organización emisora |
| `issue_date` | DATE | Fecha de emisión |
| `expiration_date` | DATE | Fecha de vencimiento (nullable) |
| `is_permanent` | BOOLEAN | No vence (default: false) |
| `credential_id` | VARCHAR(100) | ID de credencial (nullable) |
| `credential_url` | VARCHAR(500) | URL de verificación (nullable) |
| `skills_associated` | TEXT[] | Habilidades asociadas |

### `languages`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `student_id` | UUID (FK) | Referencia al perfil |
| `language` | VARCHAR(50) | Idioma |
| `proficiency` | ENUM | `basic`, `intermediate`, `advanced`, `native` |
| `certification` | VARCHAR(200) | Certificación (nullable, ej: TOEFL, IELTS) |

**Índices:** Unique constraint en `(student_id, language)`

### `interests`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador |
| `student_id` | UUID (FK) | Referencia al perfil |
| `area` | VARCHAR(100) | Área de interés |
| `description` | TEXT | Descripción (nullable) |
| `priority` | INTEGER | Prioridad (0-10, default: 5) |

**Índices:** Unique constraint en `(student_id, area)`

## Endpoints API

### Protegidos (`/students`) — requieren Bearer Token, rol `student`

#### Perfil

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `POST` | `/students/profile` | Crear perfil de estudiante | 201 |
| `GET` | `/students/profile` | Obtener mi perfil | 200 |
| `GET` | `/students/profile/:userId` | Ver perfil de otro estudiante | 200 |
| `PATCH` | `/students/profile` | Actualizar mi perfil | 200 |
| `GET` | `/students/search` | Buscar estudiantes (paginado) | 200 |

#### Habilidades

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `GET` | `/students/skills` | Listar mis habilidades | 200 |
| `POST` | `/students/skills` | Agregar habilidad | 201 |
| `POST` | `/students/skills/batch` | Agregar múltiples habilidades | 201 |
| `PATCH` | `/students/skills/:skillId` | Actualizar habilidad | 200 |
| `DELETE` | `/students/skills/:skillId` | Eliminar habilidad | 204 |

#### Experiencias

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `GET` | `/students/experiences` | Listar mis experiencias | 200 |
| `POST` | `/students/experiences` | Agregar experiencia | 201 |
| `PATCH` | `/students/experiences/:expId` | Actualizar experiencia | 200 |
| `DELETE` | `/students/experiences/:expId` | Eliminar experiencia | 204 |

#### Formación Académica

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `GET` | `/students/education` | Listar mi formación | 200 |
| `POST` | `/students/education` | Agregar formación | 201 |
| `PATCH` | `/students/education/:eduId` | Actualizar formación | 200 |
| `DELETE` | `/students/education/:eduId` | Eliminar formación | 204 |

#### Certificaciones

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `GET` | `/students/certifications` | Listar mis certificaciones | 200 |
| `POST` | `/students/certifications` | Agregar certificación | 201 |
| `PATCH` | `/students/certifications/:certId` | Actualizar certificación | 200 |
| `DELETE` | `/students/certifications/:certId` | Eliminar certificación | 204 |

#### Idiomas

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `GET` | `/students/languages` | Listar mis idiomas | 200 |
| `POST` | `/students/languages` | Agregar idioma | 201 |
| `PATCH` | `/students/languages/:langId` | Actualizar idioma | 200 |
| `DELETE` | `/students/languages/:langId` | Eliminar idioma | 204 |

#### Intereses

| Método | Ruta | Descripción | Código |
|--------|------|-------------|--------|
| `GET` | `/students/interests` | Listar mis intereses | 200 |
| `POST` | `/students/interests` | Agregar interés | 201 |
| `PATCH` | `/students/interests/:intId` | Actualizar interés | 200 |
| `DELETE` | `/students/interests/:intId` | Eliminar interés | 204 |

### Internos (`/internal/students`) — Sin autenticación, solo inter-servicio

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/:userId/matching-data` | Datos para matching (skills, languages, experiences) |
| `POST` | `/update-rating` | Actualizar calificación (`{ studentUserId, averageRating, totalRatings }`) |

## Cálculo de Completitud del Perfil

El `profileCompleteness` (0-100%) se calcula con pesos diferenciados:

| # | Campo | Peso |
|---|-------|------|
| 1 | `program` | 10 |
| 2 | `semester` | 10 |
| 3 | `bio` | 10 |
| 4 | `skills` (≥1) | 15 |
| 5 | `experiences` (≥1) | 15 |
| 6 | `education` (≥1) | 15 |
| 7 | `cvUrl` | 10 |
| 8 | `languages` (≥1) | 10 |
| 9 | `interests` (≥1) | 5 |
| | **Total** | **100** |

Se recalcula automáticamente al agregar/eliminar sub-entidades.

## Búsqueda de Estudiantes

`GET /students/search` soporta los siguientes filtros:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Busca en programa, bio |
| `program` | string | Filtrar por programa |
| `semesterMin` | integer | Semestre mínimo |
| `semesterMax` | integer | Semestre máximo |
| `availability` | enum | Filtrar por disponibilidad |
| `minGpa` | decimal | GPA mínimo |
| `minRating` | decimal | Calificación mínima |
| `skills` | string[] | Filtrar por habilidades |
| `skillCategory` | enum | Categoría de habilidad |
| `page` | integer (≥1) | Página (default: 1) |
| `limit` | integer (1-50) | Resultados por página (default: 10) |

**Respuesta paginada:**
```json
{
  "data": [...],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

## Eventos RabbitMQ

### Suscritos

| Evento | Cola | Acción |
|--------|------|--------|
| `auth.user.created` | `student-service.auth.user.created` | Si role=`student`, crea perfil base (programa vacío, semestre 1). Ignora conflictos 409. |
| `auth.user.deactivated` | `student-service.auth.user.deactivated` | Marca perfil como `isVisible: false` |

### Publicados

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `student.profile.updated` | `{ userId, profileCompleteness }` | Al actualizar perfil |
| `student.profile.created` | `{ userId, program }` | Al crear perfil |

## Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3003` | Puerto del servicio |
| `DATABASE_HOST` | `localhost` | Host PostgreSQL |
| `DATABASE_PORT` | `5435` | Puerto PostgreSQL |
| `DATABASE_USER` | `collabu_admin` | Usuario DB |
| `DATABASE_PASSWORD` | `collabu_secret_2025` | Contraseña DB |
| `DATABASE_NAME` | `student_db` | Nombre de la base de datos |
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
| `uuid` | ^13.x | Generación de identificadores |

## Flujos Principales

### Creación Automática de Perfil (Event-Driven)
1. Auth Service publica `auth.user.created` con `{ userId, email, role }`
2. `StudentEventsSubscriber` valida que `role === 'student'`
3. Crea perfil base: programa vacío, semestre 1, `isVisible: true`
4. Si ya existe (409), ignora gracefully

### Actualización de Perfil
1. Estudiante envía `PATCH /students/profile` con campos a actualizar
2. Se mezclan campos con existentes
3. Se recalcula `profileCompleteness` automáticamente
4. Se publica evento `student.profile.updated` con `{ userId, profileCompleteness }`

### Datos para Matching (Inter-Servicio)
1. Matching Service llama `GET /internal/students/:userId/matching-data`
2. Retorna: skills (nombre + nivel + categoría), languages (idioma + nivel), experiencias (tipo + años equivalentes)
