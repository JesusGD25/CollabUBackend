# Collab-U Backend — Guía de Ejecución

## Índice

1. [Prerequisitos](#prerequisitos)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Configuración Inicial](#configuración-inicial)
4. [Modo Desarrollo](#modo-desarrollo)
5. [Modo Producción](#modo-producción)
6. [Comandos Útiles](#comandos-útiles)
7. [Puertos de Servicios](#puertos-de-servicios)
8. [Swagger / Documentación API](#swagger--documentación-api)
9. [Solución de Problemas](#solución-de-problemas)

---

## Prerequisitos

| Herramienta | Versión mínima | Verificar con |
|-------------|---------------|---------------|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Docker Desktop | 4+ | `docker --version` |
| Docker Compose | 2+ | `docker compose version` |
| Git | 2+ | `git --version` |

> **Windows:** Asegúrate de que Docker Desktop esté corriendo antes de ejecutar cualquier comando Docker.

---

## Estructura del Proyecto

```
Backend/
├── .env                    # Variables de entorno (NO se sube a Git)
├── .env.example            # Plantilla de variables
├── .gitignore
├── package.json            # Scripts raíz del monorepo
├── Makefile                # Atajos Make
├── docker/
│   ├── docker-compose.yml      # Infraestructura: PG + RMQ + Redis
│   ├── docker-compose.dev.yml  # Override para desarrollo
│   └── init-databases.sql      # Crea 13 bases de datos
├── shared/                 # Librería compartida @collab-u/shared
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
└── services/               # 14 microservicios NestJS
    ├── api-gateway/
    ├── auth-service/
    ├── user-service/
    ├── student-service/
    ├── company-service/
    ├── project-service/
    ├── application-service/
    ├── matching-service/
    ├── evaluation-service/
    ├── notification-service/
    ├── chat-service/
    ├── admin-service/
    ├── analytics-service/
    └── storage-service/
```

---

## Configuración Inicial

### 1. Clonar y configurar variables de entorno

```bash
cd Backend
cp .env.example .env
```

Edita `.env` si necesitas cambiar credenciales (por defecto funcionan para desarrollo local):

```env
DB_USER=collabu_admin
DB_PASSWORD=collabu_secret_2025
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=admin
REDIS_PASSWORD=redis_secret_2025
JWT_SECRET=collabu-jwt-super-secret-key-change-in-production-2025
```

### 2. Compilar la librería compartida

```bash
cd Backend/shared
npm install
npm run build
```

> Esto genera `shared/dist/` con los archivos compilados que usan todos los servicios.

### 3. Instalar dependencias de los servicios

```bash
cd Backend/services/{nombre-servicio}
npm install
```

O para instalar en todos de una vez (PowerShell):

```powershell
Get-ChildItem -Path "Backend/services" -Directory | ForEach-Object {
    Push-Location $_.FullName
    npm install
    Pop-Location
}
```

---

## Modo Desarrollo

En desarrollo, la infraestructura (PostgreSQL, RabbitMQ, Redis) corre en Docker, y los servicios NestJS corren directamente con Node.js para hot-reload.

### Paso 1: Levantar infraestructura

```bash
cd Backend/docker
docker compose up -d
```

Verificar que los 3 contenedores estén healthy:

```bash
docker compose ps
```

Resultado esperado:

```
NAME                STATUS              PORTS
collab-u-postgres   Up (healthy)        0.0.0.0:5432->5432/tcp
collab-u-rabbitmq   Up (healthy)        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
collab-u-redis      Up (healthy)        0.0.0.0:6379->6379/tcp
```

### Paso 2: Ejecutar un servicio en modo watch

Abre una terminal por cada servicio que necesites:

```bash
cd Backend/services/auth-service
npm run start:dev
```

Esto levanta el servicio con hot-reload (reinicio automático al guardar cambios).

### Paso 3: Ejecutar múltiples servicios (PowerShell)

Para levantar varios servicios a la vez, usa terminales separadas o este script:

```powershell
# Levantar servicios específicos en paralelo
$servicios = @("api-gateway", "auth-service", "user-service")

foreach ($svc in $servicios) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend\services\$svc; npm run start:dev"
}
```

### Verificaciones rápidas en desarrollo

```bash
# PostgreSQL — Listar bases de datos
docker exec collab-u-postgres psql -U collabu_admin -l

# RabbitMQ — Management UI
# Abrir en navegador: http://localhost:15672
# Usuario: admin | Contraseña: admin

# Redis — Ping
docker exec collab-u-redis redis-cli -a redis_secret_2025 ping
# Respuesta esperada: PONG

# Swagger de un servicio (ejemplo auth-service en puerto 3001)
# Abrir en navegador: http://localhost:3001/api/docs
```

### Detener infraestructura

```bash
cd Backend/docker
docker compose down
```

Para eliminar también los volúmenes de datos (⚠️ borra todos los datos):

```bash
docker compose down -v
```

---

## Modo Producción

### Opción A: Docker Compose completo (recomendado para staging/demo)

> **Nota:** Requiere crear Dockerfiles para cada servicio (se implementarán en sprints posteriores).

Cada servicio tendrá su propio `Dockerfile` en `Backend/services/{servicio}/Dockerfile`. El flujo es:

```bash
# Compilar shared
cd Backend/shared
npm ci
npm run build

# Compilar cada servicio
cd Backend/services/{servicio}
npm ci
npm run build

# Ejecutar en producción
node dist/main
```

### Opción B: Ejecución directa con Node.js

Para cada servicio en producción sin Docker:

```bash
# 1. Variables de entorno de producción
export NODE_ENV=production
export DB_USER=collabu_admin
export DB_PASSWORD=<password_seguro>
export JWT_SECRET=<secret_largo_aleatorio>
# ... (todas las variables del .env)

# 2. Compilar
cd Backend/shared && npm ci && npm run build
cd Backend/services/{servicio} && npm ci && npm run build

# 3. Ejecutar
cd Backend/services/{servicio}
node dist/main
```

### Variables de entorno para producción

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| `NODE_ENV` | `development` | `production` |
| `DB_PASSWORD` | `collabu_secret_2025` | Generar con `openssl rand -hex 32` |
| `RABBITMQ_PASSWORD` | `admin` | Generar con `openssl rand -hex 32` |
| `REDIS_PASSWORD` | `redis_secret_2025` | Generar con `openssl rand -hex 32` |
| `JWT_SECRET` | valor por defecto | Generar con `openssl rand -hex 64` |
| `JWT_EXPIRATION` | `3600` (1h) | `1800` (30min) |
| `SMTP_USER` | vacío | Credenciales reales |
| `SMTP_PASSWORD` | vacío | Credenciales reales |

> **⚠️ NUNCA** uses las credenciales por defecto en producción.

---

## Comandos Útiles

### Desde la raíz (`Backend/`)

| Comando | Acción |
|---------|--------|
| `npm run docker:up` | Levantar infraestructura Docker |
| `npm run docker:down` | Detener infraestructura |
| `npm run docker:ps` | Ver estado de contenedores |
| `npm run docker:logs` | Ver logs en tiempo real |
| `npm run shared:build` | Compilar librería compartida |

### Makefile (si tienes `make` disponible)

| Comando | Acción |
|---------|--------|
| `make up` | `docker compose up -d` |
| `make down` | `docker compose down` |
| `make logs` | `docker compose logs -f` |
| `make ps` | `docker compose ps` |
| `make build-shared` | Compilar shared library |
| `make clean` | Eliminar contenedores, node_modules y dist |

### Dentro de un servicio (`Backend/services/{servicio}/`)

| Comando | Acción |
|---------|--------|
| `npm run start:dev` | Modo desarrollo con hot-reload |
| `npm run start:debug` | Modo debug (attach debugger) |
| `npm run build` | Compilar TypeScript |
| `npm run start:prod` | Ejecutar build compilado |
| `npm run test` | Ejecutar tests unitarios |
| `npm run test:e2e` | Ejecutar tests end-to-end |
| `npm run lint` | Ejecutar ESLint |

---

## Puertos de Servicios

| Servicio | Puerto | URL Base | Swagger |
|----------|--------|----------|---------|
| API Gateway | 3000 | `http://localhost:3000` | `http://localhost:3000/api/docs` |
| Auth Service | 3001 | `http://localhost:3001` | `http://localhost:3001/api/docs` |
| User Service | 3002 | `http://localhost:3002` | `http://localhost:3002/api/docs` |
| Student Service | 3003 | `http://localhost:3003` | `http://localhost:3003/api/docs` |
| Company Service | 3004 | `http://localhost:3004` | `http://localhost:3004/api/docs` |
| Project Service | 3005 | `http://localhost:3005` | `http://localhost:3005/api/docs` |
| Application Service | 3006 | `http://localhost:3006` | `http://localhost:3006/api/docs` |
| Matching Service | 3007 | `http://localhost:3007` | `http://localhost:3007/api/docs` |
| Evaluation Service | 3008 | `http://localhost:3008` | `http://localhost:3008/api/docs` |
| Notification Service | 3009 | `http://localhost:3009` | `http://localhost:3009/api/docs` |
| Chat Service | 3010 | `http://localhost:3010` | `http://localhost:3010/api/docs` |
| Admin Service | 3011 | `http://localhost:3011` | `http://localhost:3011/api/docs` |
| Analytics Service | 3012 | `http://localhost:3012` | `http://localhost:3012/api/docs` |
| Storage Service | 3013 | `http://localhost:3013` | `http://localhost:3013/api/docs` |

### Infraestructura

| Servicio | Puerto | Acceso |
|----------|--------|--------|
| PostgreSQL | 5432 | `psql -h localhost -U collabu_admin -d auth_db` |
| RabbitMQ (AMQP) | 5672 | Conexión interna de servicios |
| RabbitMQ (Management) | 15672 | `http://localhost:15672` (admin/admin) |
| Redis | 6379 | `redis-cli -h localhost -a redis_secret_2025` |

---

## Swagger / Documentación API

Cada servicio expone su documentación Swagger automáticamente en `/api/docs`.

Para acceder, levanta el servicio y abre en el navegador:

```
http://localhost:{PUERTO}/api/docs
```

Swagger incluye:
- Listado de todos los endpoints
- Esquemas de request/response con DTOs
- Botón "Try it out" para probar endpoints directamente
- Autenticación Bearer JWT (botón "Authorize" 🔒)

---

## Solución de Problemas

### Docker no levanta

```bash
# Verificar que Docker Desktop esté corriendo
docker info

# Si el puerto 5432 está ocupado (otro PostgreSQL local):
netstat -ano | findstr :5432
# Detén el proceso que ocupa el puerto o cambia el mapeo en docker-compose.yml
```

### Error "Cannot find module '@collab-u/shared'"

```bash
# Recompilar shared y reinstalar en el servicio
cd Backend/shared
npm run build

cd Backend/services/{servicio}
npm install
```

### Error de conexión a PostgreSQL

```bash
# Verificar que el contenedor esté corriendo
docker ps | findstr postgres

# Verificar logs
docker logs collab-u-postgres

# Verificar conexión manual
docker exec -it collab-u-postgres psql -U collabu_admin -d auth_db -c "SELECT 1"
```

### Error de conexión a RabbitMQ

```bash
# Verificar que el contenedor esté corriendo y healthy
docker inspect collab-u-rabbitmq --format='{{.State.Health.Status}}'

# Verificar logs
docker logs collab-u-rabbitmq
```

### Limpiar todo y empezar de cero

```bash
# Detener y eliminar contenedores + volúmenes
cd Backend/docker
docker compose down -v

# Eliminar node_modules y dist de todos los servicios (PowerShell)
Get-ChildItem -Path "Backend/services" -Directory | ForEach-Object {
    Remove-Item -Recurse -Force "$($_.FullName)\node_modules" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "$($_.FullName)\dist" -ErrorAction SilentlyContinue
}
Remove-Item -Recurse -Force "Backend/shared/node_modules" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "Backend/shared/dist" -ErrorAction SilentlyContinue

# Reinstalar todo
cd Backend/shared && npm install && npm run build
# Luego npm install en cada servicio
```

### El servicio arranca pero no conecta a la DB

Verifica que el servicio esté configurado para conectarse a la base de datos correcta. Cada servicio usa su propia DB:

| Servicio | Base de datos |
|----------|--------------|
| auth-service | `auth_db` |
| user-service | `user_db` |
| student-service | `student_db` |
| company-service | `company_db` |
| project-service | `project_db` |
| application-service | `application_db` |
| matching-service | `matching_db` |
| evaluation-service | `evaluation_db` |
| notification-service | `notification_db` |
| chat-service | `chat_db` |
| admin-service | `admin_db` |
| analytics-service | `analytics_db` |
| storage-service | `storage_db` |
