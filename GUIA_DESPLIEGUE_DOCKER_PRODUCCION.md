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

Si al abrir el frontend por IP pública o dominio (no `localhost`) sale un error 400 en `docker logs collab-u-frontend` tipo `ERROR: Bad Request ("http://TU-IP:4200/"). URL with hostname "TU-IP" is not allowed.`: es una protección anti-SSRF de `@angular/ssr` (Angular 19+), no un bug nuestro. El servidor SSR solo confía en los hosts listados en la variable **`NG_ALLOWED_HOSTS`** (formato: solo hostnames separados por coma, sin `http://` ni puerto — ej. `18.218.200.202,mi-dominio.com`). En `docker-compose.prod.yml` el servicio `frontend` la lee desde `FRONTEND_ALLOWED_HOSTS` en `.env`. Cada vez que cambie la IP pública o se agregue un dominio, hay que actualizar esa variable y recrear el contenedor:
```bash
echo "FRONTEND_ALLOWED_HOSTS=<tu-ip-o-dominio>" >> .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build frontend
```
Más info: https://angular.dev/best-practices/security#preventing-server-side-request-forgery-ssrf

Si el login (o cualquier llamada) desde el navegador falla con `net::ERR_CONNECTION_REFUSED` o CORS apuntando a `localhost:3000` estando en un servidor remoto: `CollabUFrontend/angular.json` **no tiene configurado `fileReplacements`**, así que el build de producción usa siempre `src/environments/environment.ts` (el de desarrollo) — `environment.prod.ts` nunca se aplica, es código muerto. Por eso `apiUrl`/`wsUrl` se calculan en runtime a partir de `window.location.hostname` en vez de un host fijo — si volvés a ver un host hardcodeado ahí, revisá que ese cálculo dinámico siga en `environment.ts`.

Una vez resuelto eso, puede aparecer un segundo error, ahora sí de CORS real: `No 'Access-Control-Allow-Origin' header is present`. El `api-gateway` solo permite por defecto `http://localhost:4200` y el dominio de producción hardcodeado en `main.ts`. Agregar el origen real (IP pública o dominio del frontend) vía `CORS_ALLOWED_ORIGINS` en `.env`:
```bash
echo "CORS_ALLOWED_ORIGINS=http://<tu-ip-o-dominio>:4200" >> .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api-gateway
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build api-gateway
```
Acepta varios orígenes separados por coma si hace falta.

Si el link de verificación de email (o de reset de contraseña) que llega al correo real apunta a `localhost:4200`: `auth-service` arma esos links con la variable `FRONTEND_URL` (default `http://localhost:4200` si no está seteada). Y si el link de descarga firmada de un archivo (`POST /files/:id/signed-url`) apunta a `localhost:3013`: es `storage-service` con `STORAGE_BASE_URL`, que debe apuntar al **gateway** (puerto 3000, público), no al puerto interno de storage-service (3013, no publicado al host). Las dos van en `.env`:
```bash
echo "FRONTEND_URL=http://<tu-ip-o-dominio>:4200" >> .env
echo "STORAGE_BASE_URL=http://<tu-ip-o-dominio>:3000" >> .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml build auth-service storage-service
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build auth-service storage-service
```

**Resumen — todas las variables de `.env` que dependen de la IP/dominio público** (repasar esta lista completa cada vez que cambie la IP, si no se usa Elastic IP):
- `FRONTEND_ALLOWED_HOSTS` (solo el host, sin protocolo/puerto)
- `CORS_ALLOWED_ORIGINS` (con `http://` y `:4200`)
- `FRONTEND_URL` (con `http://` y `:4200`)
- `STORAGE_BASE_URL` (con `http://` y `:3000`, apunta al gateway)

## Despliegue en un servidor remoto (EC2 u otro VPS)

Si el código vive en dos repos Git separados (backend/frontend) en vez de en esta carpeta local, clonarlos como hermanos dentro de una misma carpeta padre — el compose referencia el frontend como `../../CollabUFrontend` relativo a `Backend/docker/`:
```bash
mkdir -p ~/collabu && cd ~/collabu
git clone -b <rama> <url-repo-backend> Backend
git clone -b <rama> <url-repo-frontend> CollabUFrontend
```

En el servidor hace falta, además de Docker: **Node.js** (para los scripts de seed `generate-seed-files.mjs`/`migrate-*.mjs`, que corren en el host, no en Docker) y **PowerShell** (para `Run-Seed.ps1`). Ver instrucciones de instalación de ambos y de Docker Engine en un Ubuntu Server limpio en el historial de esta sesión, o pedir de nuevo la guía completa paso a paso.

**No dejar los secretos por defecto del repo en un servidor expuesto a internet** (`collabu_secret_2025`, `admin/admin`, el `JWT_SECRET` de ejemplo, etc. están en el código, visibles para cualquiera). Generar valores propios en `Backend/docker/.env` con `openssl rand -hex 24` (evitar `base64`: puede generar `/` que rompe la `RABBITMQ_URL`, que embebe el password directo en una URL).

Al construir las 15 imágenes en una VM con pocos vCPU, `docker compose build` corriendo los 15 builds en paralelo puede saturar CPU/red y causar fallos de red intermitentes contra el registro de npm. Si pasa, buildear de a uno:
```bash
for s in auth-service user-service student-service company-service project-service application-service matching-service evaluation-service notification-service chat-service admin-service analytics-service storage-service api-gateway frontend; do
  docker compose -f docker-compose.yml -f docker-compose.prod.yml build "$s" || { echo "FALLÓ $s"; break; }
done
```
Y correr el build (y cualquier paso largo) dentro de `tmux`/`screen` — si se corta la conexión SSH a mitad de un comando en primer plano, el comando muere con la sesión. Los contenedores ya levantados (`docker compose up -d`) no dependen de esto, son independientes de la sesión SSH/tmux una vez arrancados.

Ver `AUDITORIA_RECURSOS_DOCKER.md` para el detalle completo de estos hallazgos y las correcciones aplicadas.

---

# Guía paso a paso completa (servidor nuevo, desde cero)

Todo el camino, de punta a punta, para desplegar en un servidor Ubuntu Server nuevo (probado en AWS EC2, sirve igual en cualquier VPS con Ubuntu 22.04/24.04/26.04). Asume que el código ya tiene todos los fixes de esta guía aplicados y pusheados a los repos.

Requisitos previos: servidor con IP pública, acceso SSH, y en el firewall/Security Group los puertos **22** (SSH), **4200** (frontend) y **3000** (API gateway) abiertos en inbound. Mínimo 4GB RAM / 2vCPU (ver `AUDITORIA_RECURSOS_DOCKER.md` para detalle de recursos).

## 1. Conectarse por SSH

```bash
ssh -i tu-clave.pem ubuntu@<IP-PUBLICA>
```

## 2. Instalar Docker Engine

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker

docker version && docker compose version
```

## 3. Instalar Node.js 20 y PowerShell (para los scripts de seed)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version

# PowerShell
sudo apt install -y wget apt-transport-https software-properties-common
wget -q "https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb" -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y powershell
pwsh --version
```

## 4. Instalar tmux (para que los builds largos sobrevivan si se corta la conexión SSH)

```bash
sudo apt install -y tmux
```

## 5. Clonar los repos (backend y frontend, como carpetas hermanas)

Con SSH deploy keys ya configuradas (una por repo, agregadas en GitHub → Settings → Deploy keys de cada repo) y `~/.ssh/config` con los alias correspondientes:

```bash
mkdir -p ~/collabu && cd ~/collabu
git clone -b <rama> git@github-backend:<usuario>/<repo-backend>.git Backend
git clone -b <rama> git@github-frontend:<usuario>/<repo-frontend>.git CollabUFrontend
```

## 6. Generar secretos propios

```bash
cd ~/collabu/Backend/docker

DB_PASS=$(openssl rand -hex 24)
RABBIT_PASS=$(openssl rand -hex 24)
REDIS_PASS=$(openssl rand -hex 24)
JWT=$(openssl rand -hex 48)

cat > .env << EOF
DB_USER=collabu_admin
DB_PASSWORD=${DB_PASS}
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=${RABBIT_PASS}
REDIS_PASSWORD=${REDIS_PASS}
JWT_SECRET=${JWT}
FRONTEND_ALLOWED_HOSTS=<IP-PUBLICA-o-dominio>
CORS_ALLOWED_ORIGINS=http://<IP-PUBLICA-o-dominio>:4200
FRONTEND_URL=http://<IP-PUBLICA-o-dominio>:4200
STORAGE_BASE_URL=http://<IP-PUBLICA-o-dominio>:3000
# SMTP real (opcional) — sin esto, los emails solo quedan registrados en el
# log de notification-service, no se envían de verdad.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
EOF
```
Reemplazá `<IP-PUBLICA-o-dominio>` por la IP pública real (o dominio) del servidor en las 4 líneas. Si vas a mandar emails reales, completá también las variables `SMTP_*` (con Gmail, `SMTP_PASSWORD` debe ser una App Password, no la contraseña normal de la cuenta).
Reemplazá `<IP-PUBLICA-o-dominio>` por la IP pública real del servidor (sin `http://` en `FRONTEND_ALLOWED_HOSTS`, con `http://` y puerto en `CORS_ALLOWED_ORIGINS`).

## 7. Build de las 15 imágenes, dentro de tmux y de a una (evita saturar CPU/red y que muera si se corta la conexión)

```bash
tmux new -s build
cd ~/collabu/Backend/docker

for s in auth-service user-service student-service company-service project-service application-service matching-service evaluation-service notification-service chat-service admin-service analytics-service storage-service api-gateway frontend; do
  echo "=== building $s ==="
  docker compose -f docker-compose.yml -f docker-compose.prod.yml build "$s" || { echo "FALLÓ $s"; break; }
done
```
Salir de tmux sin matar el build: `Ctrl+b` y después `d`. Volver a verlo: `tmux attach -t build`.

## 8. Levantar infra base (Postgres, RabbitMQ, Redis)

```bash
docker compose -f docker-compose.yml up -d
docker compose -f docker-compose.yml ps
```
Esperar `healthy` en los 3.

## 9. Bootstrap de esquema (solo la primera vez, volumen de Postgres vacío)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.bootstrap.yml up -d --no-build
sleep 40
docker exec collab-u-postgres psql -U collabu_admin -d student_db -tAc "\dt"
```
Debe listar tablas.

## 10. Pasar a producción real (recrea sin el bootstrap)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build auth-service user-service student-service company-service project-service application-service matching-service evaluation-service notification-service chat-service admin-service analytics-service storage-service api-gateway frontend
```

## 11. Sembrar datos de prueba

```bash
cd ~/collabu/Backend
pwsh ./scripts/Run-Seed.ps1
```
La parte SQL corre sola; si el script avisa que faltó resolver catálogos, correr manualmente:
```bash
cd scripts
node generate-seed-files.mjs --out ../seed-generated
node migrate-skills-unification.mjs
node migrate-student-program.mjs
```

## 12. Verificación final

```bash
docker compose -f ~/collabu/Backend/docker/docker-compose.yml -f ~/collabu/Backend/docker/docker-compose.prod.yml ps
```
18/18 en `healthy`. Login de prueba:
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin01@collabu.dev","password":"CollabU2026!"}'
```
Debe devolver un `accessToken`.

Desde el navegador (no desde el servidor): `http://<IP-PUBLICA>:4200`.

## Para actualizar después de un cambio de código

```bash
cd ~/collabu/Backend   && git pull   # o CollabUFrontend según qué repo cambió
cd docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml build <servicio>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build <servicio>
```

## Parar/arrancar la instancia (con Elastic IP ya asignada)

Con una **Elastic IP** asociada a la instancia (recomendado — así la IP pública no cambia nunca al parar/arrancar), no hay que hacer nada manual: al arrancar la instancia, Docker levanta solo (el daemon está habilitado como servicio de systemd) y los 18 contenedores se reinician solos porque tienen `restart: unless-stopped`.

Esperar ~1 minuto después de que la instancia esté "running" en la consola de AWS, y verificar por SSH:

```bash
docker compose -f ~/collabu/Backend/docker/docker-compose.yml -f ~/collabu/Backend/docker/docker-compose.prod.yml ps
```

18/18 en `healthy` sin correr ningún otro comando. Si alguno no llegó a `healthy` todavía, esperar un poco más y repetir el `ps` — los healthchecks tienen un `start_period` de hasta ~25s.

**Sin Elastic IP** (IP pública nueva cada vez que se para/arranca): además de lo anterior, hay que actualizar `.env` con la IP nueva y recrear `frontend`/`api-gateway` — ver sección "Sin Elastic IP" más arriba en este documento.
