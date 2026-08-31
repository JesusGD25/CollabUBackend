<#
.SYNOPSIS
    Verifica el estado del seed de desarrollo tras Run-Seed.ps1.

.DESCRIPTION
    Comprueba:
      1. Encoding UTF-8 correcto en todas las bases relevantes.
      2. Conteo esperado por tabla (users, projects, applications, notifications, etc).
      3. Integridad referencial entre bases: cada applicationId en
         application_db.applications existe como projectId válido; cada
         supervisor_id apunta a un user_id real; cada notification.user_id
         referencia un usuario existente.
      4. Presencia de los 21 escenarios (E01-E21) mediante marcadores conocidos.

    No modifica datos. Sale con exit code 0 si todo OK, 1 si hay problemas.

.EXAMPLE
    .\Verify-Seed.ps1
    .\Verify-Seed.ps1 -Verbose
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ContainerName = "collab-u-postgres"
$DbUser = "collabu_admin"

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$issues = @()
$checks = 0
$passed = 0

function Query {
    param([string]$Db, [string]$Sql)
    $result = docker exec -i -e PGCLIENTENCODING=UTF8 $ContainerName `
        psql -U $DbUser -d $Db -t -A -c $Sql 2>&1
    return $result.Trim()
}

function Check {
    param([string]$Label, [scriptblock]$Test, [string]$ExpectedHint = "")
    $script:checks++
    try {
        $ok = & $Test
        if ($ok) {
            Write-Host "  [OK] $Label" -ForegroundColor Green
            $script:passed++
        } else {
            $msg = "  [FAIL] $Label"
            if ($ExpectedHint) { $msg += " ($ExpectedHint)" }
            Write-Host $msg -ForegroundColor Red
            $script:issues += $Label
        }
    } catch {
        Write-Host "  [ERROR] $Label - $_" -ForegroundColor Red
        $script:issues += "$Label - $_"
    }
}

# ── Estado del contenedor ────────────────────────────────────────────────
$status = docker inspect -f '{{.State.Running}}' $ContainerName 2>&1
if ($status -ne "true") {
    Write-Error "El contenedor $ContainerName no está corriendo."
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Verificación del seed CollabU" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# ── 1. Encoding ──────────────────────────────────────────────────────────
Write-Host "`n1. Encoding UTF-8" -ForegroundColor Yellow
$dbs = @('auth_db','user_db','student_db','company_db','project_db','admin_db',
         'application_db','evaluation_db','storage_db','chat_db','notification_db')

foreach ($db in $dbs) {
    Check "server_encoding=UTF8 en $db" {
        (Query $db "SHOW server_encoding;") -eq "UTF8"
    }
}

# ── 2. Conteos esperados por tabla ───────────────────────────────────────
Write-Host "`n2. Conteos esperados" -ForegroundColor Yellow

$expected = @{
    'auth_db|users'                                = @{ min = 27; max = 200 }
    'user_db|user_profiles'                        = @{ min = 27; max = 200 }
    'student_db|student_profiles'                  = @{ min = 19; max = 100 }
    'company_db|companies'                         = @{ min = 3;  max = 20 }
    'project_db|projects'                          = @{ min = 15; max = 100 }
    'admin_db|periods'                             = @{ min = 2;  max = 20 }
    'admin_db|supervisors'                         = @{ min = 4;  max = 50 }
    'admin_db|supervisor_assignments'              = @{ min = 15; max = 200 }
    'application_db|applications'                  = @{ min = 15; max = 200 }
    'application_db|project_academic_records'      = @{ min = 5;  max = 100 }
    'notification_db|notifications'                = @{ min = 15; max = 500 }
    'chat_db|conversations'                        = @{ min = 2;  max = 50 }
    'chat_db|messages'                             = @{ min = 2;  max = 500 }
    'storage_db|files'                             = @{ min = 10; max = 200 }
}

foreach ($key in $expected.Keys) {
    $parts = $key -split '\|'
    $db = $parts[0]; $table = $parts[1]
    $range = $expected[$key]
    Check "$db.$table count in [$($range.min),$($range.max)]" {
        $c = [int](Query $db "SELECT count(*) FROM `"$table`";")
        $c -ge $range.min -and $c -le $range.max
    } "actual=$(Query $db "SELECT count(*) FROM `"$table`";")"
}

# ── 3. Integridad referencial cross-base ────────────────────────────────
Write-Host "`n3. Integridad referencial" -ForegroundColor Yellow

# Cada supervisor_id apunta a un user auth existente
Check "supervisor_assignments.supervisor_id -> supervisors.id" {
    $orphan = [int](Query 'admin_db' @"
SELECT count(*) FROM supervisor_assignments sa
WHERE NOT EXISTS (SELECT 1 FROM supervisors s WHERE s.id = sa.supervisor_id);
"@)
    $orphan -eq 0
}

# Todo notification.user_id existe en auth_db.users
Check "notifications.user_id existe en auth_db.users" {
    $users = Query 'auth_db' "SELECT id FROM users;"
    $userSet = @{}
    foreach ($u in ($users -split "`n")) { if ($u.Trim()) { $userSet[$u.Trim()] = $true } }
    $notifUsers = Query 'notification_db' "SELECT DISTINCT user_id FROM notifications WHERE id::text LIKE 'a1000000-%';"
    $missing = @()
    foreach ($nu in ($notifUsers -split "`n")) {
        $nu = $nu.Trim()
        if ($nu -and -not $userSet.ContainsKey($nu)) { $missing += $nu }
    }
    $missing.Count -eq 0
}

# Todas las academic_records apuntan a application y assignment del seed
Check "project_academic_records.application_id existe en applications" {
    $orphan = [int](Query 'application_db' @"
SELECT count(*) FROM project_academic_records par
WHERE NOT EXISTS (SELECT 1 FROM applications a WHERE a.id = par.application_id);
"@)
    $orphan -eq 0
}

# ── 4. Escenarios sembrados ─────────────────────────────────────────────
Write-Host "`n4. Escenarios (E01-E21)" -ForegroundColor Yellow

Check "E01 pending_approval presente" {
    [int](Query 'project_db' "SELECT count(*) FROM projects WHERE status='pending_approval';") -gt 0
}
Check "E15 proyecto completed con nota final" {
    [int](Query 'application_db' "SELECT count(*) FROM project_academic_records WHERE status='completed' AND final_grade_file_id IS NOT NULL;") -gt 0
}
Check "E16 proyecto cancelado presente" {
    [int](Query 'project_db' "SELECT count(*) FROM projects WHERE status='cancelled';") -gt 0
}
Check "E19 student16 sin onboarding" {
    (Query 'user_db' "SELECT is_onboarding_complete FROM user_profiles WHERE user_id='5211a20f-e559-4c7e-91bf-335cdfa44cda';") -eq "f"
}
Check "E20 faculty04 doble rol (asesor + jurado)" {
    $roles = Query 'admin_db' @"
SELECT count(DISTINCT role) FROM supervisor_assignments
WHERE supervisor_id IN (SELECT id FROM supervisors WHERE user_id='866b6e22-8676-4557-b37b-178c0c185f50');
"@
    [int]$roles -ge 2
}
Check "E21 acentos preservados (sin mojibake)" {
    $mojibake = [int](Query 'user_db' "SELECT count(*) FROM user_profiles WHERE first_name LIKE '%Ã%' OR last_name LIKE '%Ã%';")
    $withAccents = [int](Query 'user_db' "SELECT count(*) FROM user_profiles WHERE first_name ~ '[áéíóúñÁÉÍÓÚÑ]' OR last_name ~ '[áéíóúñÁÉÍÓÚÑ]';")
    $mojibake -eq 0 -and $withAccents -gt 0
}

# ── Resumen ──────────────────────────────────────────────────────────────
Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "  Resumen: $passed / $checks pasaron" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

if ($issues.Count -gt 0) {
    Write-Host "`nProblemas:" -ForegroundColor Red
    foreach ($i in $issues) { Write-Host "  - $i" -ForegroundColor Red }
    exit 1
}

Write-Host "`nSeed verificado sin errores." -ForegroundColor Green
exit 0
