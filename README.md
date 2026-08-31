# Collab-U — Backend

**Collab-U** es una plataforma web para la Facultad de Ingeniería de la Universidad de Nariño que centraliza la gestión de pasantías, prácticas profesionales y proyectos colaborativos entre **estudiantes**, **empresas**, **docentes/asesores** y **administración/Facultad**: publicación y postulación a oportunidades, emparejamiento (matching) entre perfiles y proyectos, seguimiento académico del proceso (anteproyecto, jurados, entregables), comunicación por chat, evaluación bidireccional y paneles institucionales de reportes y verificación.

Este repositorio contiene el **backend** (14 microservicios NestJS). La interfaz de usuario vive en un repositorio hermano, **[CollabUFrontend](https://github.com/DivergenteNM/CollabUFrontend)** (Angular), que consume este backend a través del API Gateway. Ambos repos son independientes y deben clonarse por separado — ver la sección [Puesta en marcha desde cero](#puesta-en-marcha-desde-cero-ambos-repos) para cómo se conectan.

## Arquitectura

Backend basado en **14 microservicios** con NestJS (TypeScript): un API Gateway y 13 servicios de negocio, cada uno con su propia base de datos. Comunicación síncrona vía HTTP (a través del gateway y entre servicios cuando necesitan datos de otro dominio) y asíncrona vía RabbitMQ (eventos de dominio, p. ej. `application.created`, `company.verified`).

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
| Docker + Docker Compose | Contenedorización (infraestructura y despliegue completo) |
| Jest | Pruebas unitarias, de controlador y de extremo a extremo |

## Módulos de negocio (por servicio)

| Servicio | Puerto | Base de datos | Dominio |
|----------|--------|----------------|---------|
| **API Gateway** | 3000 | — | Punto de entrada único, enrutamiento hacia los 13 servicios |
| Auth Service | 3001 | `auth_db` | Registro, login, JWT, verificación de correo, recuperación de contraseña |
| User Service | 3002 | `user_db` | Cuenta de usuario base y rol de plataforma |
| Student Service | 3003 | `student_db` | Perfil estudiantil: habilidades, experiencia, documentos |
| Company Service | 3004 | `company_db` | Perfil empresarial y verificación institucional |
| Project Service | 3005 | `project_db` | Oportunidades/proyectos: creación, publicación, cierre |
| Application Service | 3006 | `application_db` | Postulaciones, selección, anteproyecto y jurados, seguimiento académico |
| Matching Service | 3007 | `matching_db` | Cálculo de afinidad estudiante–proyecto y desglose explicativo |
| Evaluation Service | 3008 | `evaluation_db` | Evaluación bidireccional al cierre del proceso |
| Notification Service | 3009 | `notification_db` | Notificaciones internas y correo (SMTP) |
| Chat Service | 3010 | `chat_db` | Mensajería en tiempo real (directa, grupal, por proyecto) |
| Admin Service | 3011 | `admin_db` | Verificación de empresas, asignación de asesores, periodos, cola de trabajo académico |
| Analytics Service | 3012 | `analytics_db` | Métricas y reportes institucionales |
| Storage Service | 3013 | `storage_db` | Archivos y documentos de soporte |

## Estructura General

```
Backend/
├── README.md                        ← Este archivo
├── GUIA_EJECUCION.md                ← Guía detallada paso a paso (dev local, sin Docker de servicios)
├── GUIA_DESPLIEGUE_DOCKER_PRODUCCION.md  ← Guía detallada del despliegue 100% Docker
├── Makefile                         ← Atajos (make up/down/install/build-shared)
├── .env.example                     ← Plantilla de variables de entorno
│
├── shared/                          ← Librería compartida @collab-u/shared
│   └── src/
│       ├── dto/ interfaces/ guards/ decorators/ filters/ interceptors/
│       ├── rabbitmq/                ← Conexión y pub/sub con RabbitMQ
│       ├── http-client/             ← Cliente HTTP entre servicios
│       ├── resilience/              ← Circuit breaker y retry
│       └── constants/               ← Enums, routing keys, códigos de error
│
├── services/                        ← Los 14 microservicios (ver tabla arriba)
│   ├── api-gateway/
│   ├── auth-service/ … storage-service/
│
├── scripts/
│   ├── seed_full_up.sql             ← Seed completo de desarrollo (idempotente)
│   ├── seed_full_down.sql           ← Rollback del seed
│   └── Run-Seed.ps1                 ← Wrapper PowerShell para sembrar/revertir
│
└── docker/
    ├── docker-compose.yml           ← Infraestructura: PostgreSQL + RabbitMQ + Redis
    ├── docker-compose.prod.yml      ← Los 14 servicios + frontend, listos para producción/demo
    ├── Dockerfile.service           ← Dockerfile genérico reutilizado por los 14 servicios
    ├── init-databases.sql           ← Crea las 13 bases al primer arranque
    ├── nginx/                       ← Reverse proxy (opcional)
    └── rabbitmq/                    ← Config custom de RabbitMQ
```

## Bases de Datos

**1 contenedor de PostgreSQL** con **13 bases de datos separadas**, una por servicio de negocio (el API Gateway no persiste datos, actúa como proxy). Ver la columna "Base de datos" de la tabla de servicios arriba. `init-databases.sql` las crea automáticamente al primer arranque del contenedor; el esquema de cada base (tablas, columnas, índices) lo crea TypeORM en desarrollo (`synchronize: true`) al arrancar cada servicio — **no hay migraciones manuales** en este proyecto (ver detalle en `GUIA_EJECUCION.md`, sección 6).

## Comunicación entre Servicios

- **Síncrona (HTTP):** el API Gateway reenvía las peticiones del frontend al servicio correspondiente. Los servicios también se llaman entre sí directamente vía HTTP interno cuando necesitan datos de otro dominio (p. ej. Matching Service consulta a Student Service y Project Service).
- **Asíncrona (RabbitMQ):** los servicios publican eventos de dominio y otros servicios suscritos reaccionan (p. ej. `notification-service` crea una notificación cuando `application-service` publica `application.status_changed`).

---

## Puesta en marcha desde cero (ambos repos)

Collab-U necesita **este repositorio (backend)** corriendo antes de que el frontend sirva de algo — el frontend solo renderiza pantallas, toda la lógica y los datos viven aquí. Hay dos formas de levantar todo: **desarrollo local** (más rápido para programar, con hot-reload) o **todo en Docker** (un solo comando, más parecido a producción). Elige una.

### Prerequisitos (ambas rutas)

| Herramienta | Versión mínima | Verificar con |
|-------------|---------------|---------------|
| Node.js | 20+ (probado con 24) | `node -v` |
| npm | 9+ | `npm -v` |
| Docker Desktop | 4+ | `docker --version` |
| Docker Compose | 2+ | `docker compose version` |
| Git | 2+ | `git --version` |

> **Windows:** Docker Desktop debe estar corriendo antes de ejecutar cualquier comando `docker`.

### Paso 0 — Clonar ambos repositorios como carpetas hermanas

Los `docker-compose.prod.yml` de este repo y las rutas relativas de desarrollo asumen que ambos proyectos comparten el mismo directorio padre:

```bash
mkdir CollabU && cd CollabU
git clone https://github.com/JesusGD25/CollabUBackend.git Backend
git clone https://github.com/DivergenteNM/CollabUFrontend.git CollabUFrontend
```

Al terminar deberías tener:

```
CollabU/
├── Backend/           ← este repositorio
└── CollabUFrontend/   ← repositorio del frontend
```

---

### Ruta A — Desarrollo local (recomendada para programar)

Infraestructura (Postgres/RabbitMQ/Redis) en Docker; los 14 servicios y el frontend corren como procesos Node nativos con hot-reload.

**1. Variables de entorno**

```bash
cd Backend
cp .env.example .env
```

Los valores por defecto funcionan tal cual para desarrollo local (**no usar en producción**, ver sección [Modo Producción](#modo-producción) más abajo).

**2. Compilar la librería compartida**

```bash
cd shared
npm install
npm run build
cd ..
```

**3. Instalar dependencias de los 14 servicios** (PowerShell, ejecutar desde `Backend/`)

```powershell
$servicios = @(
    "auth-service","user-service","api-gateway","student-service","company-service",
    "project-service","application-service","matching-service","evaluation-service",
    "notification-service","chat-service","admin-service","storage-service","analytics-service"
)
foreach ($svc in $servicios) { Push-Location "services\$svc"; npm install; Pop-Location }
```

**4. Levantar la infraestructura Docker**

```powershell
cd docker
docker compose up -d
docker compose ps   # espera ~20-30s a que postgres/rabbitmq/redis queden "healthy"
cd ..
```

**5. Arrancar los 14 servicios** (una ventana por servicio, hot-reload con `nest start --watch`)

```powershell
$servicios = @(
    "auth-service","user-service","api-gateway","student-service","company-service",
    "project-service","application-service","matching-service","evaluation-service",
    "notification-service","chat-service","admin-service","storage-service","analytics-service"
)
foreach ($svc in $servicios) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\services\$svc'; npm run start:dev"
}
```

Espera a que las 14 ventanas muestren `Nest application successfully started` (la primera vez tarda ~60-90s en compilar). En este primer arranque, TypeORM crea automáticamente el esquema de las 13 bases de datos — no hay pasos de migración.

**6. Sembrar datos de desarrollo** (opcional pero muy recomendado — sin esto la plataforma arranca vacía)

```powershell
cd scripts
.\Run-Seed.ps1
cd ..
```

Es idempotente (se puede correr varias veces sin duplicar datos) y deja sembrados todos los roles reales y proyectos/postulaciones cubriendo los estados del flujo académico. Ver la tabla completa de cuentas y escenarios en `GUIA_EJECUCION.md`, sección 8. Contraseña de **todas** las cuentas sembradas: `CollabU2026!` (solo válida en este seed de desarrollo).

**7. Levantar el frontend**

```bash
cd ../CollabUFrontend
npm install
npm start
```

Disponible en **http://localhost:4200**. El frontend detecta automáticamente el API Gateway en el puerto 3000 del mismo host donde se sirve (no requiere configuración manual de URL) — ver detalles en `CollabUFrontend/README.md`.

**Verificar que todo quedó arriba:**

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin01@collabu.dev","password":"CollabU2026!"}'
```

Guía completa con todos los detalles (troubleshooting, verificación por servicio, reinicio/limpieza): **`GUIA_EJECUCION.md`**.

---

### Ruta B — Todo en Docker (backend + frontend, un solo comando)

Construye una imagen por cada uno de los 14 microservicios y una imagen del frontend (Angular SSR), y levanta los 18 contenedores (3 de infraestructura + 14 servicios + frontend) de una vez. Requiere haber clonado ambos repos como carpetas hermanas (Paso 0), porque el build del frontend referencia `../../CollabUFrontend` desde `docker-compose.prod.yml`.

```bash
cd Backend
cp .env.example .env      # si no lo hiciste en la Ruta A
cd docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Esto levanta:

- `postgres`, `rabbitmq`, `redis` (infraestructura, definida en `docker-compose.yml`)
- Los 14 servicios de backend (definidos en `docker-compose.prod.yml`, `NODE_ENV=production`, sin hot-reload)
- El frontend Angular servido por su propio Express/SSR, en el puerto **4200**

Sembrar datos de desarrollo dentro de este entorno:

```powershell
cd ..\scripts
.\Run-Seed.ps1
```

Detener y limpiar:

```bash
cd Backend/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml down       # detener
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v    # detener y borrar datos
```

Guía completa de esta ruta (variables de entorno de producción, rebuild de un solo servicio, logs, healthchecks): **`GUIA_DESPLIEGUE_DOCKER_PRODUCCION.md`**.

---

## Puertos de Servicios

| Servicio | Puerto | Swagger |
|----------|--------|---------|
| API Gateway | 3000 | `http://localhost:3000/api/docs` |
| Auth … Storage Service | 3001–3013 | `http://localhost:{puerto}/api/docs` (ver tabla de módulos arriba) |
| **Frontend (Angular)** | **4200** | — |
| PostgreSQL | 5435 | `psql -h localhost -p 5435 -U collabu_admin -d auth_db` |
| RabbitMQ (Management UI) | 15672 | `http://localhost:15672` (admin/admin) |
| Redis | 6379 | `redis-cli -h localhost -a redis_secret_2025` |

## Base de Datos: esquema y migraciones

No se usan migraciones de TypeORM. En desarrollo (`NODE_ENV=development`), `synchronize: true` crea y actualiza el esquema a partir de las entidades cada vez que un servicio arranca — basta con reiniciar el servicio tras cambiar una entidad. En producción `synchronize` se desactiva (no hay flujo de migraciones formal implementado todavía; ver `GUIA_DESPLIEGUE_DOCKER_PRODUCCION.md`).

## Testing

Suite de pruebas automatizadas consolidada durante la fase de testing interno del proyecto:

| Nivel | Resultado |
|---|---|
| Unitarias de backend | 656 pruebas, 14/14 servicios en verde |
| Extremo a extremo de backend | 15/15 suites en verde (14 servicios + API Gateway) |
| Integración real del motor de matching | 16/16 en verde, contra infraestructura real (Postgres/RabbitMQ levantados) |

```bash
cd services/{servicio}
npm run test          # unitarias
npm run test:e2e      # extremo a extremo
npm run test:cov      # con cobertura
```

## Documentación adicional

| Documento | Contenido |
|---|---|
| `GUIA_EJECUCION.md` | Guía paso a paso de desarrollo local: instalación, arranque, seed, cuentas de prueba, verificación, troubleshooting |
| `GUIA_DESPLIEGUE_DOCKER_PRODUCCION.md` | Guía del despliegue 100% Docker (Ruta B): variables de producción, rebuild, healthchecks |
| `docker/README.md` | Detalle de la configuración de Docker (compose, Dockerfile.service, nginx, rabbitmq) |
| [`../CollabUFrontend/README.md`](../CollabUFrontend/README.md) | Documentación del frontend: arquitectura Angular, features, rutas, cómo correrlo |

## Modo Producción — resumen de variables

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| `NODE_ENV` | `development` | `production` (desactiva `synchronize`) |
| `DB_PASSWORD` | `collabu_secret_2025` | Generar con `openssl rand -hex 32` |
| `RABBITMQ_PASSWORD` | `admin` | Generar con `openssl rand -hex 32` |
| `REDIS_PASSWORD` | `redis_secret_2025` | Generar con `openssl rand -hex 32` |
| `JWT_SECRET` | valor por defecto | Generar con `openssl rand -hex 64` |
| `SMTP_USER` / `SMTP_PASSWORD` | vacío | Credenciales reales del proveedor SMTP |
| `FRONTEND_URL` | `http://localhost:4200` | URL pública real del frontend desplegado |

> **Nunca** uses las credenciales de este documento, del `.env.example` ni las del seed de desarrollo en un entorno con datos reales.

Detalle completo en `GUIA_EJECUCION.md` (sección "Modo Producción") y `GUIA_DESPLIEGUE_DOCKER_PRODUCCION.md`.
