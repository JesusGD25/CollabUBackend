<#
.SYNOPSIS
    Verifica la cobertura de estados del seed por departamento (Sistemas / Electronica / Civil).

.DESCRIPTION
    Lee la base de datos real y comprueba que cada entidad (cuentas, estudiantes, empresas, proyectos,
    postulaciones, asignaciones, anteproyectos, registros academicos, entregables, evaluaciones, docentes,
    notificaciones y chat) tenga representado cada estado que la demo necesita, y que los tres departamentos
    esten equilibrados. Sale con codigo 1 si falta algun requisito. No modifica datos.

.EXAMPLE
    .\Verify-Seed-Coverage.ps1
    .\Verify-Seed-Coverage.ps1 -Quiet     # solo el resultado final
#>
param ([switch]$Quiet)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeArgs = @((Join-Path $ScriptDir "verify-seed-coverage.mjs"))
if ($Quiet) { $nodeArgs += "--quiet" }
node @nodeArgs
exit $LASTEXITCODE
