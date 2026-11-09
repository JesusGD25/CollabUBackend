<#
.SYNOPSIS
    Siembra el seed "showcase" de Collab-U (cohorte completa para demos y sustentacion).

.DESCRIPTION
    Agrega, SIN tocar el seed base y de forma idempotente:
      - 4 empresas verificadas con perfil completo
      - 20 estudiantes con perfil 100% completo
      - 24 proyectos en todos los estados (skills reales del catalogo, entregables)
      - ~44 postulaciones con historial, entrevistas y pruebas tecnicas
      - 13 hilos academicos (7 completados + 6 en curso) con asesor, jurados,
        anteproyecto, documentos, entregables, comentarios y evaluaciones
      - todos los archivos PDF de ejemplo, descargables

    Pasos que ejecuta:
      1. Genera seed_showcase.sql leyendo los catalogos REALES de la BD
         (skills, programas, asesores, periodos) y los PDF de ejemplo.
      2. Aplica el SQL en el contenedor collab-u-postgres.
      3. Si storage-service esta dockerizado, copia los PDF a /app/uploads del
         contenedor (con Docker, storage-service no lee del disco del host).
      4. Refresca las fechas de cierre de convocatorias del seed base.
      5. Aplica seed_analytics_enrichment.sql (datos de las cuentas demo principales).
      6. Calcula el match score de TODAS las postulaciones con matching-service
         (seed-match-scores.mjs): llena applications.match_score y match_results.
      7. Dispara la agregacion de analitica (backfill mensual + semanal + diaria),
         porque analytics_db NUNCA se llena por INSERT directo. Tambien crea un snapshot
         "de ayer" de skills (seed_skill_trends_history.sql) para que la tendencia se vea.

    Requisitos: seed base cargado (Run-Seed.ps1) y servicios corriendo
    (el paso 6 necesita matching-service y el 7 el api-gateway y analytics-service).

.PARAMETER PublicApiUrl
    URL publica del api-gateway tal como la ve el NAVEGADOR (se guarda en los links
    de CV y de entregables). En el servidor: http://<IP-PUBLICA>:3000
    Por defecto: http://localhost:3000

.PARAMETER GatewayUrl
    URL del gateway desde esta maquina, para el paso de analitica.
    Por defecto: la misma de PublicApiUrl.

.PARAMETER Today
    Fecha "de hoy" del escenario (yyyy-MM-dd). Define cierres de convocatorias y
    entrevistas futuras. Por defecto: hoy.

.EXAMPLE
    .\Run-Seed-Showcase.ps1
    .\Run-Seed-Showcase.ps1 -PublicApiUrl http://3.18.230.105:3000
    .\Run-Seed-Showcase.ps1 -SkipAnalytics
#>

param (
    [string]$PublicApiUrl = "http://localhost:3000",
    [string]$GatewayUrl = "",
    [string]$Today = "",
    [switch]$SkipAnalytics,
    [switch]$SkipEnrichment,
    [switch]$SkipMatching
)

$ErrorActionPreference = "Stop"
# Windows PowerShell 5.1 envia "Expect: 100-continue" en cada POST y el api-gateway no
# responde a ese handshake: la peticion se cuelga hasta el timeout. En pwsh 7 no aplica.
[System.Net.ServicePointManager]::Expect100Continue = $false
$ContainerName = "collab-u-postgres"
$StorageContainer = "collab-u-storage-service"
$DbUser = "collabu_admin"
$RemotePath = "/tmp/collabu-showcase.sql"

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-Not $GatewayUrl) { $GatewayUrl = $PublicApiUrl }
$PublicApiUrl = $PublicApiUrl.TrimEnd('/')
$GatewayUrl = $GatewayUrl.TrimEnd('/')
# En Windows con Docker Desktop, 'localhost' resuelve primero a IPv6 (::1) y pasa por
# wslrelay, que se cuelga con Windows PowerShell 5.1. Las llamadas de este script usan
# 127.0.0.1 (el navegador, en cambio, puede seguir usando localhost).
$GatewayUrl = $GatewayUrl -replace '//localhost(?=[:/]|$)', '//127.0.0.1'

function Invoke-SqlFile {
    param([string]$LocalPath, [string]$Label)
    docker cp $LocalPath "${ContainerName}:${RemotePath}"
    if ($LASTEXITCODE -ne 0) { Write-Error "No se pudo copiar $Label al contenedor." }
    docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName psql -U $DbUser -d postgres -v ON_ERROR_STOP=1 -q -f $RemotePath | Out-Null
    $code = $LASTEXITCODE
    docker exec -i $ContainerName rm -f $RemotePath | Out-Null
    if ($code -ne 0) {
        Write-Host "Error al ejecutar $Label en la base de datos." -ForegroundColor Red
        exit $code
    }
}

$status = docker inspect -f '{{.State.Running}}' $ContainerName 2>&1
if ($status -ne "true") {
    Write-Error "El contenedor $ContainerName no esta corriendo. Ejecuta 'docker compose up -d' en Backend/docker primero."
}

# -- 1. Generar SQL + archivos ------------------------------------------------
Write-Host "[1/7] Generando el seed showcase (lee los catalogos reales de la BD)..." -ForegroundColor Green
$SqlPath = Join-Path $ScriptDir "seed_showcase.sql"
$storageStatus = docker inspect -f '{{.State.Running}}' $StorageContainer 2>&1
$StorageRunning = ($storageStatus -eq "true")
$UploadStage = $null

$genArgs = @("--public-url", $PublicApiUrl, "--out", $SqlPath, "--container", $ContainerName)
if ($Today) { $genArgs += @("--today", $Today) }
if ($StorageRunning) {
    $UploadStage = Join-Path ([System.IO.Path]::GetTempPath()) "collabu-showcase-uploads"
    if (Test-Path $UploadStage) { Remove-Item -Recurse -Force $UploadStage }
    $genArgs += @("--upload-dir", $UploadStage, "--storage-prefix", "/app/uploads")
    Write-Host "      storage-service dockerizado detectado: los PDF se copiaran a /app/uploads." -ForegroundColor DarkGray
}

node (Join-Path $ScriptDir "generate-seed-showcase.mjs") @genArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "No se pudo generar el seed showcase. Verifica que el seed base este cargado y los contenedores corriendo." -ForegroundColor Red
    exit $LASTEXITCODE
}

# -- 2. Aplicar SQL -----------------------------------------------------------
Write-Host "[2/7] Aplicando el SQL (idempotente)..." -ForegroundColor Green
Invoke-SqlFile -LocalPath $SqlPath -Label "seed_showcase.sql"

# -- 3. Archivos fisicos ------------------------------------------------------
if ($StorageRunning) {
    Write-Host "[3/7] Copiando los PDF al contenedor $StorageContainer..." -ForegroundColor Green
    docker exec -i $StorageContainer mkdir -p /app/uploads | Out-Null
    docker cp "$UploadStage/." "${StorageContainer}:/app/uploads/"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "No se pudieron copiar los archivos al contenedor $StorageContainer." -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Remove-Item -Recurse -Force $UploadStage -ErrorAction SilentlyContinue
} else {
    Write-Host "[3/7] storage-service no esta dockerizado: los PDF ya quedaron en su carpeta uploads local." -ForegroundColor DarkGray
}

# -- 4. Refresco de fechas del seed base --------------------------------------
Write-Host "[4/7] Refrescando cierres de convocatorias del seed base..." -ForegroundColor Green
Invoke-SqlFile -LocalPath (Join-Path $ScriptDir "seed_refresh_dates.sql") -Label "seed_refresh_dates.sql"

# -- 5. Enrichment de cuentas demo --------------------------------------------
if (-Not $SkipEnrichment) {
    Write-Host "[5/7] Aplicando seed_analytics_enrichment.sql (cuentas demo principales)..." -ForegroundColor Green
    Invoke-SqlFile -LocalPath (Join-Path $ScriptDir "seed_analytics_enrichment.sql") -Label "seed_analytics_enrichment.sql"
} else {
    Write-Host "[5/7] Enrichment omitido (-SkipEnrichment)." -ForegroundColor DarkGray
}

# -- 6. Match scores ----------------------------------------------------------
# Las postulaciones se insertan directo en la BD (sin pasar por application-service, que es
# quien calcula el score al postular). Aqui se calcula con el algoritmo real de matching-service.
if (-Not $SkipMatching) {
    Write-Host "[6/7] Calculando match score de las postulaciones (matching-service)..." -ForegroundColor Green
    node (Join-Path $ScriptDir "seed-match-scores.mjs") --container $ContainerName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "No se pudieron calcular los match score (el seed SI quedo cargado)." -ForegroundColor Yellow
        Write-Host "Reintenta con: node scripts/seed-match-scores.mjs  (requiere matching-service corriendo)." -ForegroundColor Yellow
    }
} else {
    Write-Host "[6/7] Match scores omitidos (-SkipMatching)." -ForegroundColor DarkGray
}

# -- 7. Agregacion de analitica -----------------------------------------------
if (-Not $SkipAnalytics) {
    Write-Host "[7/7] Ejecutando la agregacion de analitica (backfill + diaria)..." -ForegroundColor Green
    try {
        $loginBody = @{ email = "admin01@collabu.dev"; password = "CollabU2026!" } | ConvertTo-Json -Compress
        $login = Invoke-RestMethod -Method Post -Uri "$GatewayUrl/api/v1/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 60
        $headers = @{ Authorization = "Bearer $($login.accessToken)" }

        # Backfill: primer dia de cada mes desde 2025-06 + ultimas 6 semanas.
        $dates = @()
        $cursor = Get-Date -Year 2025 -Month 6 -Day 1 -Hour 0 -Minute 0 -Second 0
        $firstOfThisMonth = Get-Date -Day 1 -Hour 0 -Minute 0 -Second 0
        while ($cursor -lt $firstOfThisMonth) { $dates += $cursor.ToString("yyyy-MM-dd"); $cursor = $cursor.AddMonths(1) }
        for ($k = 6; $k -ge 1; $k--) { $dates += (Get-Date).AddDays(-7 * $k).ToString("yyyy-MM-dd") }
        $histBody = @{ dates = $dates } | ConvertTo-Json -Compress
        $hist = Invoke-RestMethod -Method Post -Uri "$GatewayUrl/api/v1/analytics/aggregate/run-historical" -Headers $headers -ContentType "application/json" -Body $histBody -TimeoutSec 120
        Write-Host "      backfill historico: $($hist.written) snapshots" -ForegroundColor DarkGray
        Invoke-RestMethod -Method Post -Uri "$GatewayUrl/api/v1/analytics/aggregate/run" -Headers $headers -TimeoutSec 120 | Out-Null
        Write-Host "      agregacion diaria ejecutada" -ForegroundColor DarkGray
        # La tendencia de skills compara contra el snapshot de ayer: se crea uno minimo para la demo.
        Invoke-SqlFile -LocalPath (Join-Path $ScriptDir "seed_skill_trends_history.sql") -Label "seed_skill_trends_history.sql"
        Write-Host "      tendencias de skills con historial minimo" -ForegroundColor DarkGray
    } catch {
        Write-Host "No se pudo ejecutar la agregacion de analitica: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "El seed SI quedo cargado. Puedes dispararla luego (login admin01 y POST /api/v1/analytics/aggregate/run-historical y /aggregate/run)," -ForegroundColor Yellow
        Write-Host "o esperar al cron diario de la 1 AM. Para omitir este paso: -SkipAnalytics." -ForegroundColor Yellow
    }
} else {
    Write-Host "[7/7] Analitica omitida (-SkipAnalytics)." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Seed showcase cargado." -ForegroundColor Cyan
Write-Host "Cuentas nuevas (clave CollabU2026!): empresa.andestech|agronarino|cimientos|volcan@collabu.dev" -ForegroundColor DarkGray
Write-Host "y estudiantes nombre.apellido@collabu.dev (ver GUIA_SEED_SHOWCASE.md)." -ForegroundColor DarkGray
