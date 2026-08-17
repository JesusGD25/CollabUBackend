<#
.SYNOPSIS
    Siembra (o revierte) el seed de desarrollo completo de Collab-U.

.DESCRIPTION
    Ejecuta scripts/seed_full_up.sql (o seed_full_down.sql con -Rollback) dentro
    del contenedor collab-u-postgres via psql. Requiere que los 13 servicios
    backend hayan arrancado al menos una vez (TypeORM synchronize crea el
    esquema de tablas en cada base de datos) antes de sembrar.

    El archivo se copia al contenedor con docker cp y se ejecuta con psql -f.
    NO se canaliza con Get-Content | docker exec: en Windows PowerShell 5.1 eso
    corrompe los acentos dos veces.

.EXAMPLE
    .\Run-Seed.ps1            # Siembra los datos de desarrollo
    .\Run-Seed.ps1 -Rollback  # Elimina unicamente las filas sembradas
    .\Run-Seed.ps1 -Verify    # Comprueba que los acentos se almacenaron bien
#>

param (
    [switch]$Rollback,
    [switch]$Verify
)

$ErrorActionPreference = "Stop"
$ContainerName = "collab-u-postgres"
$DbUser = "collabu_admin"
$RemotePath = "/tmp/collabu-seed.sql"

# La consola y las tuberias hablan UTF-8 durante toda la ejecucion.
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-Psql {
    param([string]$Sql)
    docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName `
        psql -U $DbUser -d postgres -t -A -c $Sql
}

$ContainerStatus = docker inspect -f '{{.State.Running}}' $ContainerName 2>&1
if ($ContainerStatus -ne "true") {
    Write-Error "El contenedor $ContainerName no esta corriendo. Ejecuta 'docker compose up -d' en Backend/docker primero."
}

# -- Verificacion de encoding ------------------------------------------------
if ($Verify) {
    Write-Host "Verificando el almacenamiento de caracteres especiales..." -ForegroundColor Cyan

    $serverEncoding = Invoke-Psql "SHOW server_encoding;"
    Write-Host "  server_encoding: $serverEncoding"
    if ($serverEncoding.Trim() -ne "UTF8") {
        Write-Host "  La base de datos no esta en UTF8. Recrea el volumen." -ForegroundColor Red
        exit 1
    }

    $accented = docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName `
        psql -U $DbUser -d user_db -t -A -c `
        "SELECT count(*) FROM user_profiles WHERE first_name ~ '[a-zA-Z]' OR last_name ~ '[a-zA-Z]';"

    $mojibake = docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName `
        psql -U $DbUser -d user_db -t -A -c `
        "SELECT count(*) FROM user_profiles WHERE first_name LIKE '%Ã%' OR last_name LIKE '%Ã%';"

    Write-Host "  Perfiles con texto correcto: $($accented.Trim())"
    Write-Host "  Perfiles con caracteres corruptos: $($mojibake.Trim())"

    if ([int]$mojibake.Trim() -gt 0) {
        Write-Host "Hay datos corruptos. Ejecuta .\Run-Seed.ps1 -Rollback y siembra de nuevo." -ForegroundColor Red
        exit 1
    }
    if ([int]$accented.Trim() -eq 0) {
        Write-Host "No se encontraron perfiles. Esta el seed cargado?" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Encoding correcto." -ForegroundColor Green
    exit 0
}

# -- Siembra / reversion -----------------------------------------------------
if ($Rollback) {
    Write-Host "Revirtiendo el seed de desarrollo..." -ForegroundColor Yellow
    $SqlFile = Join-Path $ScriptDir "seed_full_down.sql"
} else {
    Write-Host "Sembrando datos de desarrollo..." -ForegroundColor Green
    $SqlFile = Join-Path $ScriptDir "seed_full_up.sql"
}

if (-Not (Test-Path $SqlFile)) {
    Write-Error "No se encontro el archivo $SqlFile"
}

Write-Host "Copiando el script al contenedor..."
docker cp $SqlFile "${ContainerName}:${RemotePath}"
if ($LASTEXITCODE -ne 0) {
    Write-Error "No se pudo copiar $SqlFile al contenedor."
}

Write-Host "Ejecutando script SQL..."
docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName `
    psql -U $DbUser -d postgres -v ON_ERROR_STOP=1 -f $RemotePath
$psqlExit = $LASTEXITCODE

docker exec -i $ContainerName rm -f $RemotePath | Out-Null

if ($psqlExit -ne 0) {
    Write-Host "Ocurrio un error al ejecutar la operacion en la base de datos." -ForegroundColor Red
    exit $psqlExit
}

# -- Archivos fisicos --------------------------------------------------------
if (-Not $Rollback) {
    Write-Host "Generando los archivos de ejemplo..." -ForegroundColor Green
    $GeneratedSql = Join-Path $ScriptDir "seed_file_paths.generated.sql"

    node (Join-Path $ScriptDir "generate-seed-files.mjs") --out $GeneratedSql
    if ($LASTEXITCODE -ne 0) {
        Write-Host "No se pudieron generar los archivos de ejemplo." -ForegroundColor Red
        exit $LASTEXITCODE
    }

    docker cp $GeneratedSql "${ContainerName}:${RemotePath}"
    docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName `
        psql -U $DbUser -d postgres -v ON_ERROR_STOP=1 -f $RemotePath
    $pathsExit = $LASTEXITCODE
    docker exec -i $ContainerName rm -f $RemotePath | Out-Null

    if ($pathsExit -ne 0) {
        Write-Host "No se pudieron actualizar las rutas de los archivos." -ForegroundColor Red
        exit $pathsExit
    }

    # -- Resolucion contra catalogos reales (admin-service) ------------------
    # skill_catalog y academic_programs se generan en runtime (admin-service
    # onModuleInit) con UUIDs no deterministas, asi que el seed SQL siembra
    # catalog_skill_id=NULL y academic_programs como texto -- estos dos scripts
    # los resuelven contra el catalogo real ya arrancado. Sin este paso, los
    # proyectos de los escenarios de matching (FASE 6) quedan con
    # academic_programs en texto plano, lo que hace que matching-service falle
    # con 503 al intentar resolver el programa contra admin-service.
    Write-Host "Resolviendo catalogSkillId y academic_programs contra los catalogos reales..." -ForegroundColor Green
    node (Join-Path $ScriptDir "migrate-skills-unification.mjs")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "No se pudo resolver el catalogo de skills/programas. Verifica que admin-service, student-service y project-service esten corriendo, y vuelve a correr:" -ForegroundColor Red
        Write-Host "  node scripts/migrate-skills-unification.mjs" -ForegroundColor DarkGray
        Write-Host "  node scripts/migrate-student-program.mjs" -ForegroundColor DarkGray
        exit $LASTEXITCODE
    }

    node (Join-Path $ScriptDir "migrate-student-program.mjs")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "No se pudo resolver el programId de los estudiantes. Vuelve a correr:" -ForegroundColor Red
        Write-Host "  node scripts/migrate-student-program.mjs" -ForegroundColor DarkGray
        exit $LASTEXITCODE
    }
}

Write-Host "Operacion completada con exito." -ForegroundColor Cyan
if (-Not $Rollback) {
    Write-Host "Comprueba el encoding con: .\Run-Seed.ps1 -Verify" -ForegroundColor DarkGray
}
