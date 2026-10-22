<#
.SYNOPSIS
    Siembra TODO el dato de demostracion de Collab-U en un solo paso (base + showcase + departamentos).

.DESCRIPTION
    Punto de entrada unico del seed (PLANNING_ADMIN_DEPARTAMENTOS_Y_AJUSTES.md, seccion 8):

      1. Seed base                 (Run-Seed.ps1)                  cuentas demo y escenarios protegidos de matching
      2. Showcase + departamentos  (Run-Seed-Showcase.ps1)         empresas, estudiantes, proyectos, hilos, docentes,
                                                                    admins de departamento, notificaciones y chat
      3. Arreglos de departamentos (seed-departments-fixups.mjs)   sin estudiantes "Industrial", sin cuentas de prueba,
                                                                    program_id en postulaciones/asignaciones, escala 0-100
      4. Match score               (seed-match-scores.mjs)         algoritmo real de matching-service
      5. Analitica                 (seed-analytics.mjs)            series por departamento y de la Facultad
      6. Verificacion de cobertura (verify-seed-coverage.mjs)      falla (exit 1) si falta algun estado de la matriz

    Todo es idempotente: se puede volver a ejecutar sin duplicar filas.

    Requisitos: contenedores de Docker arriba y los 14 servicios backend corriendo (el generador lee los catalogos
    reales que admin-service crea en runtime; el paso 4 necesita matching-service y el 5, gateway y analytics-service).

.PARAMETER PublicApiUrl
    URL publica del api-gateway tal como la ve el NAVEGADOR (se guarda en los links de CV y entregables).
.PARAMETER Today
    Fecha "de hoy" del escenario (yyyy-MM-dd). Por defecto: hoy.
.PARAMETER SkipBase
    No ejecuta el seed base (util si ya esta cargado).
.PARAMETER SkipMatching / SkipAnalytics
    Omiten los pasos 4 y 5.

.EXAMPLE
    .\Run-Seed-All.ps1
    .\Run-Seed-All.ps1 -SkipBase -PublicApiUrl http://3.18.230.105:3000
#>

param (
    [string]$PublicApiUrl = "http://localhost:3000",
    [string]$Today = "",
    [switch]$SkipBase,
    [switch]$SkipMatching,
    [switch]$SkipAnalytics
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Container = "collab-u-postgres"

function Step($n, $total, $text) { Write-Host "[$n/$total] $text" -ForegroundColor Green }
function Fail($text, $code) { Write-Host $text -ForegroundColor Red; exit $code }

$status = docker inspect -f '{{.State.Running}}' $Container 2>&1
if ($status -ne "true") { Fail "El contenedor $Container no esta corriendo. Ejecuta 'docker compose up -d' en Backend/docker primero." 1 }

$total = 6
if ($SkipBase) { Step 1 $total "Seed base omitido (-SkipBase)." } else {
    Step 1 $total "Seed base..."
    & (Join-Path $ScriptDir "Run-Seed.ps1")
    if ($LASTEXITCODE -ne 0) { Fail "Fallo el seed base." $LASTEXITCODE }
}

Step 2 $total "Showcase + departamentos (genera el SQL leyendo los catalogos reales de la BD)..."
$showArgs = @{ PublicApiUrl = $PublicApiUrl; SkipAnalytics = $true; SkipMatching = $true }
if ($Today) { $showArgs.Today = $Today }
& (Join-Path $ScriptDir "Run-Seed-Showcase.ps1") @showArgs
if ($LASTEXITCODE -ne 0) { Fail "Fallo el showcase." $LASTEXITCODE }

Step 3 $total "Arreglos de la capa de departamentos..."
node (Join-Path $ScriptDir "seed-departments-fixups.mjs") --container $Container
if ($LASTEXITCODE -ne 0) { Fail "Fallaron los arreglos de departamentos." $LASTEXITCODE }

if ($SkipMatching) { Step 4 $total "Match score omitido (-SkipMatching)." } else {
    Step 4 $total "Calculando match score (matching-service)..."
    node (Join-Path $ScriptDir "seed-match-scores.mjs") --container $Container
    if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo calcular el match score (el seed SI quedo cargado). Reintenta con: node scripts/seed-match-scores.mjs" -ForegroundColor Yellow }
}

if ($SkipAnalytics) { Step 5 $total "Analitica omitida (-SkipAnalytics)." } else {
    Step 5 $total "Agregacion de analitica por departamento..."
    node (Join-Path $ScriptDir "seed-analytics.mjs") --gateway $PublicApiUrl --container $Container
    if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo agregar la analitica (el seed SI quedo cargado). Reintenta con: node scripts/seed-analytics.mjs" -ForegroundColor Yellow }
}

Step 6 $total "Verificando la cobertura de estados por departamento..."
node (Join-Path $ScriptDir "verify-seed-coverage.mjs") --container $Container
$cov = $LASTEXITCODE

Write-Host ""
if ($cov -eq 0) { Write-Host "Seed completo y verificado." -ForegroundColor Cyan } else { Write-Host "Seed cargado, pero la cobertura tiene faltantes (ver arriba)." -ForegroundColor Yellow }
Write-Host "Cuentas (clave CollabU2026!): admin01 (Facultad) | admin.sistemas | admin.electronica | admin.civil @collabu.dev" -ForegroundColor DarkGray
exit $cov
