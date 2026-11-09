# Redespliegue total en AWS (borrar versión antigua + datos y sembrar el showcase)

EC2 `3.18.230.105` · repos en `~/collabu/Backend` y `~/collabu/CollabUFrontend` · rama `develop`. **No tocar el `.env` de la EC2.**
Esquema nuevo (departamentos) lo crea el bootstrap en un volumen vacío: **no hace falta** `schema-upgrade-departments.sql`.

## 0. En la PC (antes de conectarse)
Ambos repos subidos: `git rev-list --left-right --count HEAD...@{u}` debe dar `0 0` en Backend y CollabUFrontend.

## 1. Conectar y preparar
```bash
ssh -i <llave>.pem ubuntu@3.18.230.105
tmux attach -t deploy || tmux new -s deploy
for r in Backend CollabUFrontend; do (cd ~/collabu/$r && git fetch && git checkout develop && git pull && git log --oneline -1); done
```

## 2. Borrar la versión antigua con sus datos (DESTRUCTIVO)
```bash
cd ~/collabu/Backend/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
docker image prune -af && docker builder prune -af && df -h /
```

## 3. Build de las 15 imágenes (de a una, dentro de tmux)
```bash
cd ~/collabu/Backend/docker
for s in auth-service user-service student-service company-service project-service application-service matching-service evaluation-service notification-service chat-service admin-service analytics-service storage-service api-gateway frontend; do
  docker compose -f docker-compose.yml -f docker-compose.prod.yml build $s || break
done
```

## 4. Infraestructura, bootstrap de esquema y producción
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres rabbitmq redis
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.bootstrap.yml up -d --no-build
sleep 60
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --no-build
sleep 60; docker compose -f docker-compose.yml -f docker-compose.prod.yml ps   # 18/18 healthy
```

## 5. Seed completo (reemplaza a Run-Seed + Run-Seed-Showcase)
```bash
cd ~/collabu/Backend
pwsh ./scripts/Run-Seed-All.ps1 -PublicApiUrl http://3.18.230.105:3000
```
Hace: base → showcase + departamentos → fixups → match score → analítica por departamento → verificador de cobertura (debe terminar en «Cobertura completa ✔»).

## 6. Verificar y dejar la demo lista
```bash
node scripts/demo-check.mjs          # todo ✔
node scripts/demo-state.mjs save     # foto del estado inicial de la demo
```
Navegador en ventana de incógnito: `http://3.18.230.105:4200`, login `admin01@collabu.dev` / `CollabU2026!`.
Después de cada ensayo: `node scripts/demo-state.mjs restore`.

## 7. Al terminar
Detener la instancia (la Elastic IP se conserva; asociada a una instancia detenida cuesta unos centavos por hora).

## Notas
- El cron horario de `evaluation-service` vence evaluaciones pendientes con fecha pasada: si el seed queda más de unos días antes de la demo, re-ejecuta `node scripts/seed-departments-fixups.mjs`.
- Pasadas ~4 semanas, re-ejecuta `Run-Seed-All.ps1 -SkipBase -PublicApiUrl ...`.
- El log del frontend mostrará `ECONNREFUSED` del render en servidor en páginas autenticadas: es ruido, no afecta.
