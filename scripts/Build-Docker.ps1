<#
.SYNOPSIS
    Construye las 15 imagenes de Docker (14 microservicios + frontend) de a una, con el codigo actual.

.DESCRIPTION
    Equivale a `docker compose -f docker-compose.yml -f docker-compose.prod.yml build` pero secuencial: compilar los 15
    en paralelo (npm install + tsc/ng build) agota la memoria de la VM de Docker Desktop (8 GB). Las capas comunes
    (base alpine, build de shared) se reutilizan de la cache, asi que solo el primer servicio tarda mucho.

    Requiere Docker Desktop corriendo. Los logs quedan en %TEMP%\docker-build\<servicio>.log.

.PARAMETER Services
    Servicios a construir (por defecto los 14 + frontend).
.PARAMETER NoCache
    Fuerza la construccion sin cache (usalo si un cambio de codigo no se refleja).

.EXAMPLE
    .\Build-Docker.ps1
    .\Build-Docker.ps1 -Services auth-service,frontend -NoCache
#>
param (
    [string[]]$Services = @(
        'api-gateway', 'auth-service', 'user-service', 'student-service', 'company-service', 'project-service', 'application-service',
        'matching-service', 'evaluation-service', 'notification-service', 'chat-service', 'admin-service', 'analytics-service',
        'storage-service', 'frontend'
    ),
    [switch]$NoCache
)

$ErrorActionPreference = "Continue"
$dockerDir = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "docker"
$log = Join-Path ([System.IO.Path]::GetTempPath()) "docker-build"
New-Item -ItemType Directory -Force $log | Out-Null
Set-Location $dockerDir

$failed = @()
foreach ($s in $Services) {
    $t0 = Get-Date
    Write-Host "[build] $s ..." -ForegroundColor Green
    $args = @('compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.prod.yml', 'build')
    if ($NoCache) { $args += '--no-cache' }
    $args += $s
    & docker @args *> (Join-Path $log "$s.log")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[build] $s FALLO (ver $log\$s.log)" -ForegroundColor Red
        $failed += $s
    } else {
        Write-Host ("[build] {0} listo en {1:N0} s" -f $s, ((Get-Date) - $t0).TotalSeconds)
    }
}
if ($failed.Count) { Write-Host "Fallaron: $($failed -join ', ')" -ForegroundColor Red; exit 1 }
Write-Host "Las 15 imagenes estan construidas." -ForegroundColor Cyan
