#!/usr/bin/env node
/**
 * Backfill de datos: student_db.student_profiles.program (texto libre) -> program_id
 * (FK lógica contra admin_db.academic_programs), ver PLANNING_MATCHING_SERVICE_FIX.md §9.
 *
 * `program` NO se borra ni se toca — solo se puebla `program_id` cuando el texto matchea
 * (case-insensitive, trim) contra el nombre de un programa activo del catálogo real.
 *
 * Requisitos:
 *   - Contenedor Postgres corriendo (docker), nombre configurable via POSTGRES_CONTAINER
 *     (default: collab-u-postgres).
 *   - admin-service corriendo y accesible en ADMIN_SERVICE_URL (default: http://localhost:3011)
 *     — usa su endpoint interno /internal/admin/programs (catálogo de programas activos).
 *
 * Uso:
 *   node migrate-student-program.mjs [--dry-run]
 *
 * Es idempotente: solo actualiza filas con program_id IS NULL.
 */

import { execFileSync } from 'node:child_process';

const CONTAINER = process.env.POSTGRES_CONTAINER || 'collab-u-postgres';
const PGUSER = process.env.POSTGRES_USER || 'collabu_admin';
const ADMIN_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3011';
const DRY_RUN = process.argv.includes('--dry-run');
// '\x01' (no imprimible) como separador: '' rompe queries multi-columna porque psql
// concatena las columnas sin nada entre ellas y .split('') las parte por carácter.
const SEP = '\x01';

function psql(db, sql) {
  const args = ['exec', '-i', CONTAINER, 'psql', '-U', PGUSER, '-d', db, '-t', '-A', '-F', SEP, '-c', sql];
  const out = execFileSync('docker', args, { encoding: 'utf-8' });
  return out
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length > 0)
    .map((l) => l.split(SEP));
}

function exec(db, sql) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${db}: ${sql}`);
    return;
  }
  psql(db, sql);
}

function sqlString(value) {
  return `$mig$${value}$mig$`;
}

async function getActivePrograms() {
  const res = await fetch(`${ADMIN_URL}/internal/admin/programs`);
  if (!res.ok) throw new Error(`admin-service respondió ${res.status} obteniendo programas`);
  return res.json();
}

async function main() {
  console.log(`Backfill program_id — ${DRY_RUN ? 'DRY RUN (sin escribir cambios)' : 'ejecutando cambios'}`);

  const programs = await getActivePrograms();
  if (!programs.length) {
    console.error('admin_db.academic_programs está vacío — nada contra qué resolver. Abortando.');
    process.exit(1);
  }
  const nameToId = new Map(programs.map((p) => [p.name.toLowerCase().trim(), p.id]));
  console.log(`Catálogo real: ${programs.length} programas activos.`);

  const rows = psql(
    'student_db',
    "SELECT id, program FROM student_profiles WHERE program_id IS NULL AND program IS NOT NULL AND program != ''",
  );
  if (!rows.length) {
    console.log('Nada que resolver — todos los perfiles ya tienen program_id o no tienen program.');
    return;
  }
  console.log(`${rows.length} perfiles con program_id NULL a resolver.`);

  let matched = 0;
  const unmatched = [];
  for (const [profileId, programText] of rows) {
    const id = nameToId.get(programText.toLowerCase().trim());
    if (id) {
      exec('student_db', `UPDATE student_profiles SET program_id = '${id}' WHERE id = '${profileId}' AND program_id IS NULL`);
      matched++;
    } else {
      unmatched.push({ profileId, programText });
    }
  }

  console.log(`\nResultado: ${matched}/${rows.length} perfiles vinculados a program_id.`);
  if (unmatched.length) {
    // console.log (no console.warn/error): es un resultado informativo esperado, no una falla
    // del proceso — PowerShell con $ErrorActionPreference="Stop" trata cualquier línea de
    // stderr de un proceso nativo como error terminante aunque el exit code sea 0.
    console.log(`${unmatched.length} perfiles NO pudieron mapearse (texto no coincide con ningún programa activo del catálogo):`);
    for (const { profileId, programText } of unmatched) {
      console.log(`  - ${profileId}: "${programText}"`);
    }
    console.log('Quedan con program_id = NULL (no se inventa ni se fuerza un match) — matching-service usará el fallback por substring para estos hasta que se corrijan manualmente o se agregue el programa faltante al catálogo.');
  }
}

main().catch((err) => {
  console.error('Error en el backfill:', err);
  process.exit(1);
});
