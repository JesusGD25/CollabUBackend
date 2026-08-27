# Guía de despliegue Docker (producción)

Cómo levantar todo el sistema CollabU (18 contenedores: 3 infra + 14 microservicios + frontend) en modo producción real, no desarrollo. Ver `AUDITORIA_RECURSOS_DOCKER.md` en la raíz del repo para mediciones de recursos y hallazgos de esta infraestructura.

## Archivos involucrados

Todos en `Backend/docker/`:

| Archivo | Qué hace |
|---|---|
| `docker-compose.yml` | Postgres + RabbitMQ + Redis (infra base) |
| `docker-compose.prod.yml` | Los 14 microservicios + frontend, en modo producción |
| `docker-compose.bootstrap.yml` | Override temporal, solo para la primera vez con un volumen de Postgres vacío (ver sección "Primera instalación") |
| `Dockerfile.service` | Dockerfile genérico multi-stage para los 14 microservicios NestJS |
| `../../CollabUFrontend/Dockerfile` | Build de producción SSR del frontend (Angular + Express, no `ng serve`) |
| `init-databases.sql` | Crea las 13 bases de datos lógicas la primera vez que arranca el volumen de Postgres |

## Requisitos

- Docker Desktop corriendo (`docker version` debe responder).
- En Windows con Docker Desktop: revisar cuánta RAM/CPU tiene asignada la VM (`docker info --format '{{.MemTotal}} {{.NCPU}}'`). Recomendado mínimo 4GB/2vCPU para esta pila (ver auditoría de recursos).

## Primera instalación (volumen de Postgres vacío)

**Importante — limitación conocida del código:** 12 de los 14 microservicios tienen `synchronize: NODE_ENV !== 'production'` en su configuración de TypeORM, y el proyecto **no tiene migraciones formales**. Eso significa que en un volumen de Postgres nuevo, arrancando directo en modo producción, esos servicios nunca crean sus tablas. Por eso el primer arranque necesita un paso extra de "bootstrap" antes de operar en modo producción real.

```bash
cd Backend/docker

# 1. Construir las 15 imágenes propias (14 microservicios + frontend)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# 2. Levantar solo la infra (crea las 13 bases de datos vacías)
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps   # esperar "healthy" en los 3

# 3. Bootstrap de esquema — UNA SOLA VEZ, fuerza NODE_ENV=development
#    solo para que TypeORM sincronice las tablas contra el volumen vacío
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.bootstrap.yml up -d --no-build

# Esperar ~30s y confirmar que el esquema se creó, por ejemplo:
docker exec collab-u-postgres psql -U collabu_admin -d student_db -tAc "\dt"

# 4. Recrear los microservicios SIN el bootstrap → vuelven a NODE_ENV=production real
# (una sola línea — el "\" de continuación es de bash, no funciona en PowerShell)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build auth-service user-service student-service company-service project-service application-service matching-service evaluation-service notification-service chat-service admin-service analytics-service storage-service api-gateway frontend

# 5. Sembrar datos de prueba (usuarios, empresas, proyectos, etc.)
cd ..
./scripts/Run-Seed.ps1
```

No borres `docker-compose.bootstrap.yml` — se necesita cada vez que se arranca contra un volumen de Postgres nuevo (servidor nuevo, `docker compose down -v`, restauración desde cero).

## Arranque normal (ya instalado, volumen con esquema y datos existentes)

```bash
cd Backend/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
```

No hace falta el bootstrap: las tablas ya existen en el volumen, `synchronize=false` en producción simplemente no las vuelve a tocar.

## Verificar que todo está sano

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Deben aparecer 18 contenedores en estado `healthy`. Tiempos normales de cold start: ~30s hasta que todos pasan a healthy (medido en `AUDITORIA_RECURSOS_DOCKER.md`).

- Frontend: `http://localhost:4200`
- API Gateway: `http://localhost:3000/api/v1`
- RabbitMQ management: `http://localhost:15672` (admin/admin por defecto)

## Reconstruir después de cambiar código

```bash
cd Backend/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml build <nombre-servicio>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build <nombre-servicio>
```

Si el build no refleja un cambio reciente en el código fuente (síntoma raro, pasó una vez en esta sesión), forzar sin caché:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache <nombre-servicio>
```

## Apagar todo

Conservando datos:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

Borrando todo (vuelve a ser "primera instalación" la próxima vez):
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
```

## Problemas conocidos y cómo se resolvieron (contexto para debug futuro)

Si aparecen errores `ECONNREFUSED ::1:PORT` o `503` entre microservicios (por ejemplo al calcular matching, ver postulantes o proyectos), revisar que el bloque `x-service-env` de `docker-compose.prod.yml` tenga las 13 variables `*_SERVICE_URL` apuntando a `http://<nombre-contenedor>:<puerto>` — sin ellas, los servicios se llaman entre sí por `localhost` (que dentro de un contenedor no resuelve al vecino).

Si `Run-Seed.ps1` falla con "No se pudo resolver el catálogo de skills/programas": los scripts `migrate-skills-unification.mjs` y `migrate-student-program.mjs` corren en el **host** (no en Docker) y pegan a `http://localhost:3011` (admin-service) por defecto. En modo producción solo el gateway (3000) y el frontend (4200) tienen puerto publicado al host — por eso `admin-service` tiene `ports: ["3011:3011"]` explícito en `docker-compose.prod.yml`. Si en algún momento se quita ese mapeo, el seed vuelve a fallar así.

Si `application-service`, `chat-service` o `notification-service` entran en crash-loop contra Postgres al arrancar: esos 3 usan `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME` en vez de `DATABASE_*` como el resto — revisar que su bloque `environment` en `docker-compose.prod.yml` tenga ambos juegos de variables.

Ver `AUDITORIA_RECURSOS_DOCKER.md` para el detalle completo de estos hallazgos y las correcciones aplicadas.
