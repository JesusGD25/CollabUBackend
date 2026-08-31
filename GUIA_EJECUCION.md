# Collab-U — Guía de Ejecución (Backend + Frontend)

## Índice

1. [Prerequisitos](#prerequisitos)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Configuración Inicial](#configuración-inicial)
4. [Levantar el Entorno de Desarrollo (paso a paso)](#levantar-el-entorno-de-desarrollo-paso-a-paso)
5. [Frontend](#frontend)
6. [Base de Datos: esquema y migraciones](#base-de-datos-esquema-y-migraciones)
7. [Seed de Datos de Desarrollo](#seed-de-datos-de-desarrollo)
8. [Cuentas de Prueba y Escenarios Cubiertos](#cuentas-de-prueba-y-escenarios-cubiertos)
9. [Verificación del Entorno](#verificación-del-entorno)
10. [Reinicio / Limpieza del Entorno](#reinicio--limpieza-del-entorno)
11. [Modo Producción](#modo-producción)
12. [Puertos de Servicios](#puertos-de-servicios)
13. [Solución de Problemas](#solución-de-problemas)

---

## Prerequisitos

| Herramienta | Versión mínima | Verificar con |
|-------------|---------------|---------------|
| Node.js | 20+ (probado con 24) | `node -v` |
| npm | 9+ | `npm -v` |
| Docker Desktop | 4+ | `docker --version` |
| Docker Compose | 2+ | `docker compose version` |
| Git | 2+ | `git --version` |

> **Windows:** Docker Desktop debe estar corriendo antes de ejecutar cualquier comando `docker`.

---

## Estructura del Proyecto

```
CollabU/
├── Backend/
│   ├── .env                    # Variables de entorno (NO se sube a Git)
│   ├── .env.example            # Plantilla de variables
│   ├── package.json            # Scripts raíz del monorepo
│   ├── docker/
│   │   ├── docker-compose.yml      # Infraestructura: PostgreSQL + RabbitMQ + Redis
│   │   └── init-databases.sql      # Crea las 13 bases de datos al primer arranque
│   ├── scripts/
│   │   ├── seed_full_up.sql        # Seed completo de desarrollo
│   │   ├── seed_full_down.sql      # Rollback del seed
│   │   └── Run-Seed.ps1            # Wrapper PowerShell para sembrar/revertir
│   ├── shared/                 # Librería compartida @collab-u/shared
│   └── services/                # 13 microservicios NestJS + api-gateway
│       ├── api-gateway/
│       ├── auth-service/ ... storage-service/
└── CollabUFrontend/             # Aplicación Angular 21
```

---

## Configuración Inicial

### 1. Variables de entorno

```bash
cd Backend
cp .env.example .env
```

Valores por defecto (funcionan tal cual para desarrollo local, **no usar en producción**):

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

> Genera `shared/dist/`, usado por los 14 servicios. Repetir solo si cambia código en `shared/src/`.

### 3. Instalar dependencias de todos los servicios (PowerShell)

```powershell
# Ejecutar desde: C:\...\CollabU\Backend
$servicios = @(
    "auth-service","user-service","api-gateway","student-service","company-service",
    "project-service","application-service","matching-service","evaluation-service",
    "notification-service","chat-service","admin-service","storage-service","analytics-service"
)
foreach ($svc in $servicios) {
    Write-Host "Instalando dependencias: $svc" -ForegroundColor Cyan
    Push-Location "services\$svc"; npm install; Pop-Location
}
```

> Solo necesario la primera vez o cuando cambie el `package.json` de algún servicio.

---

## Levantar el Entorno de Desarrollo (paso a paso)

### Paso 1 — Infraestructura Docker (PostgreSQL, RabbitMQ, Redis)

```powershell
cd C:\...\CollabU\Backend\docker
docker compose up -d
docker compose ps
```

Resultado esperado (espera ~20-30s a que los 3 contenedores queden `healthy`):

```
NAME                STATUS              PORTS
collab-u-postgres   Up (healthy)        0.0.0.0:5435->5432/tcp
collab-u-rabbitmq   Up (healthy)        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
collab-u-redis      Up (healthy)        0.0.0.0:6379->6379/tcp
```

Al crearse el volumen de PostgreSQL por primera vez, `init-databases.sql` crea automáticamente las 13 bases de datos (una por microservicio) con la extensión `uuid-ossp`. No es necesario ningún paso manual adicional.

### Paso 2 — Levantar los 14 servicios backend

Cada servicio corre con hot-reload vía `nest start --watch`. Abre una ventana por servicio, o usa este bloque para lanzarlas todas:

```powershell
# Ejecutar desde: C:\...\CollabU\Backend
$servicios = @(
    "auth-service","user-service","api-gateway","student-service","company-service",
    "project-service","application-service","matching-service","evaluation-service",
    "notification-service","chat-service","admin-service","storage-service","analytics-service"
)
foreach ($svc in $servicios) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\services\$svc'; npm run start:dev"
}
```

**La primera vez que arranca cada servicio**, TypeORM (`synchronize: true` en desarrollo) crea automáticamente todas las tablas de su base de datos — **no hay pasos de migración manual** en este proyecto (ver [sección 6](#base-de-datos-esquema-y-migraciones)). Espera a que las 14 ventanas muestren `Nest application successfully started` antes de continuar (~60-90s la primera vez que compilan).

Para trabajar con un solo servicio:

```powershell
cd C:\...\CollabU\Backend\services\auth-service
npm run start:dev
```

### Paso 3 — Sembrar datos de desarrollo (opcional pero recomendado)

Una vez los 14 servicios arrancaron al menos una vez (esquema creado), siembra el set de datos de prueba — ver [sección 7](#seed-de-datos-de-desarrollo).

```powershell
cd C:\...\CollabU\Backend\scripts
.\Run-Seed.ps1
```

### Paso 4 — Levantar el frontend

Ver [sección 5](#frontend).

---

## Frontend

```bash
cd CollabUFrontend
npm install
npm start
```

Esto ejecuta `ng serve`, disponible en **http://localhost:4200**. El frontend apunta al API Gateway en `http://localhost:3000/api/v1` (configurado en `src/environments/environment.ts`) — el gateway debe estar corriendo antes de usar la app.

Comandos útiles:

| Comando | Acción |
|---------|--------|
| `npm start` | Servidor de desarrollo con hot-reload (puerto 4200) |
| `npm run build` | Build de producción |
| `npm test` | Tests unitarios (Karma/Jasmine) |
| `npm run e2e` | Tests end-to-end (Playwright) |
| `npm run lint` | ESLint + Stylelint |

---

## Base de Datos: esquema y migraciones

Este proyecto **no usa migraciones de TypeORM**. Cada servicio tiene `synchronize: process.env.NODE_ENV !== 'production'` en su `database.config.ts`: en desarrollo, el esquema (tablas, columnas, índices) se crea y actualiza automáticamente a partir de las entidades cada vez que el servicio arranca.

Implicaciones prácticas:
- No hay que correr `npm run migration:run` ni nada equivalente — **arrancar el servicio ya deja el esquema al día**.
- Si cambias una entidad, basta con reiniciar el servicio (o dejar `start:dev` corriendo, que recompila y reconecta solo).
- En producción `synchronize` se desactiva — ahí sí sería necesario introducir un flujo de migraciones formal antes de desplegar (no implementado todavía).

---

## Seed de Datos de Desarrollo

`Backend/scripts/seed_full_up.sql` puebla las 13 bases de datos con un set **coherente y completo** de datos de desarrollo: todos los roles reales de usuario, y proyectos/aplicaciones cubriendo todos los estados reales del flujo académico (ver tabla de la sección siguiente).

### Requisitos antes de sembrar

Los 14 servicios deben haber arrancado **al menos una vez** (para que `synchronize` haya creado las tablas). El contenedor `collab-u-postgres` debe estar corriendo.

### Sembrar

```powershell
cd Backend\scripts
.\Run-Seed.ps1
```

Internamente ejecuta `seed_full_up.sql` contra el contenedor de PostgreSQL vía `psql`. Es **idempotente**: usa `ON CONFLICT DO NOTHING` con UUIDs determinísticos, así que correrlo varias veces no duplica datos.

### Revertir el seed

```powershell
.\Run-Seed.ps1 -Rollback
```

Elimina únicamente las filas creadas por el seed (identificadas por prefijo de UUID determinístico), sin tocar ningún otro dato que hayas creado manualmente probando la aplicación.

### ⚠️ Credenciales

**Todas** las cuentas del seed usan la misma contraseña de desarrollo:

```
CollabU2026!
```

Esta contraseña **solo existe en este seed de desarrollo** — no es una credencial real de ningún sistema, y **no debe usarse fuera de un entorno local**. No se ha dejado ninguna contraseña real ni credencial sensible en este documento.

---

## Cuentas de Prueba y Escenarios Cubiertos

Contraseña para todas las cuentas: **`CollabU2026!`**

### Roles de usuario

| Rol | Cuentas | Propósito |
|-----|---------|-----------|
| Administrador | `admin01@collabu.dev` | Revisión de proyectos, plantillas, requisitos documentales, KPIs académicos |
| Empresa (verificada) | `company01@collabu.dev` (Tech Solutions Latam), `company02@collabu.dev` (InnovaSoft SAS) | Publicar proyectos, revisar postulaciones, solicitar/revisar entregables |
| Empresa (pendiente de verificación) | `company03@collabu.dev` (Nueva Empresa SAS) | Probar el flujo con una empresa aún no verificada |
| Docente — asesor | `faculty01@collabu.dev` (Ana Ruiz) | Acompañamiento de anteproyecto, comentarios, entregables |
| Docente — jurado de anteproyecto | `faculty02@collabu.dev` (Luis Peña), `faculty03@collabu.dev` (Marta Ríos) | Votación de anteproyectos (incluye un caso de **voto parcial**, ver abajo) |
| Docente — jurado final / sustentación / asesor | `faculty04@collabu.dev` (Jorge Salas) | Evaluación final, sustentación, asesoría |
| Estudiante | `student01@collabu.dev` … `student19@collabu.dev` | Ver tabla de escenarios abajo |

### Escenarios por estudiante (proyecto ↔ estado real)

| Cuenta | Proyecto | Escenario que representa |
|--------|----------|---------------------------|
| `student01` | Motor de Recomendación con IA | Postulación `pending` |
| `student02` | Motor de Recomendación con IA | Postulación `under_review` |
| `student18` | Motor de Recomendación con IA | Postulación `rejected` |
| `student19` | Motor de Recomendación con IA | Postulación `withdrawn` |
| `student03` | Portal de Proveedores B2B | Postulación `shortlisted` |
| `student04` | Portal de Proveedores B2B | Entrevista completada (`interview`, aprobada) |
| `student05` | Sistema de Inventario en Tiempo Real | Aceptado, **asesor asignado**, sin anteproyecto aún |
| `student06` | Plataforma de Encuestas Internas | Anteproyecto **en proceso** (`submitted`) |
| `student07` | Chatbot de Soporte con NLP | Anteproyecto **en revisión con voto de jurado parcial** (Luis aprobó, Marta no ha votado) — valida el flujo de votación múltiple |
| `student08` | API de Pagos Unificada | Anteproyecto **con corrección solicitada y ya corregido** (`revised`, 1 corrección) |
| `student09` | Sistema de Facturación Electrónica | Anteproyecto **aprobado**, con **documentos pendientes** (1 pendiente, 1 enviado) |
| `student10` | Rediseño de Experiencia de Usuario | Proyecto **iniciado** (acuerdo de iniciación firmado) |
| `student11` | Optimización de Base de Datos | **En desarrollo**, con entregables (1 aprobado, 1 enviado) y un hilo de comentarios (empresa + asesor interno + estudiante) |
| `student12` | Módulo de Reportes Gerenciales | **Próximo a finalizar** (`waiting_final_docs`, alerta de progreso enviada) |
| `student13` | Sistema de Gestión Documental | **Finalizado** (`completed`), con sustentación, nota final y 3 evaluaciones completas (empresa↔estudiante↔asesor) |
| `student14` | Servicio de Notificaciones Push | Aceptado, `pending_supervisor` (asesor invitado, aún no responde) |
| `student15` | Panel de Monitoreo de Servidores | Anteproyecto **vencido** (`expired`) |
| `student16` | — | Estudiante sin postulaciones (para probar exploración/postulación desde cero) |
| `student17` | Integración con ERP Legado | Proyecto `cancelled`, postulación `cancelled` |

### Estados institucionales también cubiertos (sin estudiante asociado)

| Proyecto (empresa) | `ProjectStatus` |
|---------------------|-----------------|
| Dashboard de Analítica Interna (Tech Solutions) | `draft` — recién creado |
| Automatización de Pruebas QA (Tech Solutions) | `pending_approval` — pendiente de revisión institucional |
| Migración a Microservicios (Tech Solutions) | `needs_changes` — devuelto con observaciones del admin |
| App Móvil de Fidelización (Tech Solutions) | `published`, sin postulaciones |
| Landing Page Corporativa (Nueva Empresa, no verificada) | `draft` |

Todos los datos son coherentes entre sí: cada aplicación referencia un proyecto y estudiante reales, cada registro académico referencia una asignación de asesor/jurado real, cada anteproyecto referencia su historial de versiones, y las evaluaciones del proyecto finalizado solo existen porque su proceso académico está realmente en estado `completed` (repeta la regla de negocio validada por `evaluation-service`).

---

## Verificación del Entorno

```powershell
# PostgreSQL — bases de datos
docker exec collab-u-postgres psql -U collabu_admin -l

# RabbitMQ Management UI
# http://localhost:15672  (usuario/clave: admin/admin)

# Redis
docker exec collab-u-redis redis-cli -a redis_secret_2025 ping
# Respuesta esperada: PONG

# Salud de cada servicio
curl http://localhost:3000/health   # api-gateway
curl http://localhost:3001/health   # auth-service
# ... (ver tabla de puertos abajo)
```

Swagger de cada servicio en `http://localhost:{PUERTO}/api/docs`.

Login de prueba contra el gateway (requiere haber corrido el seed):

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin01@collabu.dev","password":"CollabU2026!"}'
```

---

## Reinicio / Limpieza del Entorno

### Detener todo (servicios locales + infraestructura Docker)

```powershell
# 1. Cierra las ventanas de PowerShell de los servicios, o:
Get-Process node | Stop-Process -Force

# 2. Detener infraestructura Docker
cd Backend\docker
docker compose down
```

### Limpieza completa (borra también los datos de las bases de datos)

```powershell
cd Backend\docker
docker compose down -v
```

Esto elimina los contenedores, la red y los volúmenes `docker_postgres_data`, `docker_rabbitmq_data`, `docker_redis_data` — es decir, **borra todos los datos**, incluido el seed. Para volver a tener un entorno funcional:

```powershell
docker compose up -d                       # 1. Reconstruir infraestructura
# 2. Arrancar los 14 servicios (Paso 2 de la sección de arriba)
cd ..\scripts; .\Run-Seed.ps1              # 3. Sembrar de nuevo
```

### Revertir solo el seed (sin tocar el resto del entorno)

```powershell
cd Backend\scripts
.\Run-Seed.ps1 -Rollback
```

---

## Modo Producción

### Compilación y ejecución sin Docker

```bash
# Shared
cd Backend/shared && npm ci && npm run build

# Cada servicio
cd Backend/services/{servicio}
npm ci && npm run build
node dist/main
```

### Variables de entorno para producción

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| `NODE_ENV` | `development` | `production` (desactiva `synchronize`, ver [sección 6](#base-de-datos-esquema-y-migraciones)) |
| `DB_PASSWORD` | `collabu_secret_2025` | Generar con `openssl rand -hex 32` |
| `RABBITMQ_PASSWORD` | `admin` | Generar con `openssl rand -hex 32` |
| `REDIS_PASSWORD` | `redis_secret_2025` | Generar con `openssl rand -hex 32` |
| `JWT_SECRET` | valor por defecto | Generar con `openssl rand -hex 64` |
| `SMTP_USER` / `SMTP_PASSWORD` | vacío | Credenciales reales del proveedor SMTP |

> **⚠️ NUNCA** uses las credenciales de este documento (ni las del seed) en un entorno con datos reales.

---

## Puertos de Servicios

| Servicio | Puerto | Base de datos | Swagger |
|----------|--------|----------------|---------|
| API Gateway | 3000 | — | `/api/docs` |
| Auth Service | 3001 | `auth_db` | `/api/docs` |
| User Service | 3002 | `user_db` | `/api/docs` |
| Student Service | 3003 | `student_db` | `/api/docs` |
| Company Service | 3004 | `company_db` | `/api/docs` |
| Project Service | 3005 | `project_db` | `/api/docs` |
| Application Service | 3006 | `application_db` | `/api/docs` |
| Matching Service | 3007 | `matching_db` | `/api/docs` |
| Evaluation Service | 3008 | `evaluation_db` | `/api/docs` |
| Notification Service | 3009 | `notification_db` | `/api/docs` |
| Chat Service | 3010 | `chat_db` | `/api/docs` |
| Admin Service | 3011 | `admin_db` | `/api/docs` |
| Analytics Service | 3012 | `analytics_db` | `/api/docs` |
| Storage Service | 3013 | `storage_db` | `/api/docs` |
| **Frontend (Angular)** | **4200** | — | — |

### Infraestructura

| Servicio | Puerto | Acceso |
|----------|--------|--------|
| PostgreSQL | 5435 | `psql -h localhost -p 5435 -U collabu_admin -d auth_db` |
| RabbitMQ (AMQP) | 5672 | Conexión interna de servicios |
| RabbitMQ (Management) | 15672 | `http://localhost:15672` (admin/admin) |
| Redis | 6379 | `redis-cli -h localhost -a redis_secret_2025` |

---

## Solución de Problemas

### Docker no levanta / puerto ocupado

```bash
docker info
netstat -ano | findstr :5435
```

Si el puerto 5435 está ocupado por otro proyecto (contenedor de otra base de datos), detén ese contenedor o cambia el mapeo de puerto en `docker-compose.yml`. **No** cambies ni detengas contenedores que no pertenezcan a este proyecto sin confirmarlo primero.

### Error "Cannot find module '@collab-u/shared'"

```bash
cd Backend/shared && npm run build
cd Backend/services/{servicio} && npm install
```

### Error de conexión a PostgreSQL

```bash
docker ps | findstr postgres
docker logs collab-u-postgres
docker exec -it collab-u-postgres psql -U collabu_admin -d auth_db -c "SELECT 1"
```

### El seed falla con "no existe la base de datos"

Asegúrate de pasar `-d postgres` (o cualquier base existente) al conectar con `psql` si ejecutas el script manualmente en vez de usar `Run-Seed.ps1` — el usuario `collabu_admin` no tiene una base de datos con su propio nombre.

### El seed falla con foreign key / tabla no existe

Los 14 servicios deben haber arrancado **al menos una vez** antes de sembrar (para que `synchronize` cree las tablas). Arranca los servicios primero, confirma `Nest application successfully started` en cada uno, y luego corre `Run-Seed.ps1`.

### Limpiar todo y empezar de cero

```powershell
Get-Process node | Stop-Process -Force
cd Backend\docker
docker compose down -v

Get-ChildItem -Path "..\services" -Directory | ForEach-Object {
    Remove-Item -Recurse -Force "$($_.FullName)\node_modules" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "$($_.FullName)\dist" -ErrorAction SilentlyContinue
}
Remove-Item -Recurse -Force "..\shared\node_modules","..\shared\dist" -ErrorAction SilentlyContinue

cd ..\shared; npm install; npm run build
# Luego npm install en cada servicio, docker compose up -d, arrancar servicios, Run-Seed.ps1
```
