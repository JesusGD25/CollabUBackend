<#
.SYNOPSIS
    Levanta los servicios backend de Collab-U como procesos independientes, de a uno.

.DESCRIPTION
    Cada servicio se lanza con `npm run start` (nest start) en una ventana oculta que sobrevive a la tarea que
    lo lanza, y se espera a que abra su puerto antes de pasar al siguiente. Arrancarlos todos a la vez agota la
    memoria (cada compilacion de Nest es pesada) y suele tumbar el gateway; en una maquina de ~16 GB cada servicio
    tarda alrededor de 3 minutos. Los que ya estan escuchando se omiten.

    Orden recomendado: api-gateway, auth, user, admin, company, notification, student, project, application,
    analytics, evaluation, matching, chat, storage. Los logs quedan en %TEMP%\svc\<servicio>.log.

    Requisitos: Docker con collab-u-postgres (puerto host 5435), redis y rabbitmq sanos.

.PARAMETER Services
    Servicios a levantar (por defecto, los 14 en el orden recomendado).

.EXAMPLE
    .\Start-Services.ps1
    .\Start-Services.ps1 -Services auth-service,user-service
#>
param (
    [string[]]$Services = @(
        'api-gateway', 'auth-service', 'user-service', 'admin-service', 'company-service', 'notification-service', 'student-service',
        'project-service', 'application-service', 'analytics-service', 'evaluation-service', 'matching-service', 'chat-service', 'storage-service'
    )
)

$ErrorActionPreference = "Stop"
$root = Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "services"
$log = Join-Path ([System.IO.Path]::GetTempPath()) "svc"
New-Item -ItemType Directory -Force $log | Out-Null

$ports = @{
    'api-gateway' = 3000; 'auth-service' = 3001; 'user-service' = 3002; 'student-service' = 3003; 'company-service' = 3004
    'project-service' = 3005; 'application-service' = 3006; 'matching-service' = 3007; 'evaluation-service' = 3008
    'notification-service' = 3009; 'chat-service' = 3010; 'admin-service' = 3011; 'analytics-service' = 3012; 'storage-service' = 3013
}

foreach ($s in $Services) {
    $p = $ports[$s]
    if (-not $p) { Write-Host "Servicio desconocido: $s" -ForegroundColor Red; continue }
    if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { "$s ya activo"; continue }
    Start-Process -FilePath 'cmd.exe' -ArgumentList "/c npm run start > `"$log\$s.log`" 2>&1" -WorkingDirectory (Join-Path $root $s) -WindowStyle Hidden
    $ok = $false
    for ($i = 1; $i -le 72; $i++) {
        Start-Sleep -Seconds 5
        if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { "$s up ($($i * 5)s)"; $ok = $true; break }
    }
    if (-not $ok) { Write-Host "$s TIMEOUT (revisa $log\$s.log)" -ForegroundColor Yellow }
}
