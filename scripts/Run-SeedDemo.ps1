<#
.SYNOPSIS
    Script para inyectar o limpiar datos de prueba en la base de datos de Collab-U usando Docker.

.DESCRIPTION
    Este script toma los archivos .sql y los ejecuta dentro del contenedor `collab-u-postgres`.
    Incluye un mecanismo de "Rollback" en caso de querer borrar los datos sembrados.

.EXAMPLE
    .\Run-SeedDemo.ps1          # Ejecuta el seed para agregar los datos
    .\Run-SeedDemo.ps1 -Rollback # Ejecuta el script de limpeza (rollback)
#>

param (
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"
$ContainerName = "collab-u-postgres"
$DbUser = "collabu_admin"

# Ubicar la ruta de esta carpeta 'scripts'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Rollback) {
    Write-Host "Iniciando ROLLBACK de los datos de demostración..." -ForegroundColor Yellow
    $SqlFile = Join-Path $ScriptDir "seed_demo_down.sql"
} else {
    Write-Host "Iniciando SEED de datos de demostración..." -ForegroundColor Green
    $SqlFile = Join-Path $ScriptDir "seed_demo_up.sql"
}

if (-Not (Test-Path $SqlFile)) {
    Write-Error "No se encontró el archivo $SqlFile"
}

# Verificamos si el contenedor de postgres está corriendo
$ContainerStatus = docker inspect -f '{{.State.Running}}' $ContainerName 2>&1
if ($ContainerStatus -ne "true") {
    Write-Error "El contenedor $ContainerName no está corriendo. Asegúrate de haber ejecutado 'docker compose up -d' primero."
}

# Ejecutar el script pipiando el contenido a psql
Write-Host "Ejecutando script SQL..."
Get-Content $SqlFile | docker exec -i $ContainerName psql -U $DbUser

if ($LASTEXITCODE -eq 0) {
    Write-Host "Operación completada con éxito." -ForegroundColor Cyan
} else {
    Write-Host "Ocurrió un error al ejecutar la operación en la base de datos." -ForegroundColor Red
}