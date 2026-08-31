#!/usr/bin/env node
/**
 * Migración de datos: unificación de skills/tags (ver PLANNING_SKILLS_ONBOARDING_PROYECTOS.md, sección 24).
 *
 * Qué hace, en orden:
 *   1. student_db.skills  -> backfill de catalog_skill_id para filas existentes sin resolver.
 *   2. project_db.project_tags        -> migradas a project_db.project_skills (category='concept' por defecto).
 *   3. project_db.project_requirements (type='skill') -> copiadas a project_db.project_skills (aditivo, no borra las requirements).
 *   4. project_db.project_skills -> backfill de catalog_skill_id para filas existentes sin resolver
 *      (cubre skills sembradas directo por SQL, sin pasar por el API).
 *   5. project_db.projects.academic_programs -> convertidas de nombres de texto libre a UUIDs de admin_db.academic_programs.
 *
 * Requisitos:
 *   - Contenedor Postgres corriendo (docker) con nombre configurable via POSTGRES_CONTAINER (default: collab-u-postgres).
 *   - admin-service corriendo y accesible en ADMIN_SERVICE_URL (default: http://localhost:3011) — se usa su
 *     endpoint interno /internal/admin/skills/by-names para resolver catalogSkillId.
 *
 * Uso:
 *   node migrate-skills-unification.mjs [--dry-run]
 *
 * Es idempotente: puede correrse varias veces sin duplicar datos (usa ON CONFLICT DO NOTHING
 * y solo actualiza filas con catalog_skill_id IS NULL).
 */

import { execFileSync } from 'node:child_process';

const CONTAINER = process.env.POSTGRES_CONTAINER || 'collab-u-postgres';
const PGUSER = process.env.POSTGRES_USER || 'collabu_admin';
const ADMIN_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3011';
const DRY_RUN = process.argv.includes('--dry-run');
const SEP = '';

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
  // dollar-quoting evita problemas de escape con comillas/acentos
  return `$mig$${value}$mig$`;
}

async function resolveSkillNames(names) {
  if (!names.length) return new Map();
  const res = await fetch(`${ADMIN_URL}/internal/admin/skills/by-names`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names }),
  });
  if (!res.ok) throw new Error(`admin-service respondió ${res.status} resolviendo skills`);
  const results = await res.json();
  return new Map(results.map((r) => [r.name, r]));
}

const VALID_PROFICIENCY = new Set(['beginner', 'intermediate', 'advanced', 'expert']);

async function migrateStudentSkillsCatalog() {
  console.log('\n== 1. Backfill catalog_skill_id en student_db.skills ==');
  const rows = psql('student_db', 'SELECT DISTINCT name FROM skills WHERE catalog_skill_id IS NULL');
  const names = rows.map((r) => r[0]).filter(Boolean);
  if (!names.length) {
    console.log('Nada que resolver.');
    return;
  }
  console.log(`Resolviendo ${names.length} nombres de habilidad contra el catálogo...`);
  const resolved = await resolveSkillNames(names);
  let updated = 0;
  for (const name of names) {
    const match = resolved.get(name);
    if (match?.skillId) {
      exec('student_db', `UPDATE skills SET catalog_skill_id = '${match.skillId}' WHERE name = ${sqlString(name)} AND catalog_skill_id IS NULL`);
      updated++;
    }
  }
  console.log(`${updated}/${names.length} nombres vinculados al catálogo.`);
}

async function migrateProjectTags() {
  console.log('\n== 2. Migrar project_db.project_tags -> project_skills ==');
  const exists = psql('project_db', "SELECT to_regclass('public.project_tags')");
  if (!exists.length || exists[0][0] === '' || exists[0][0] === undefined) {
    console.log('Tabla project_tags no existe. Nada que migrar.');
    return;
  }

  const rows = psql('project_db', 'SELECT project_id, tag FROM project_tags');
  if (!rows.length) {
    console.log('project_tags está vacía.');
  } else {
    const uniqueNames = [...new Set(rows.map((r) => r[1]))];
    console.log(`Resolviendo ${uniqueNames.length} tags contra el catálogo...`);
    const resolved = await resolveSkillNames(uniqueNames);

    for (const [projectId, tag] of rows) {
      const match = resolved.get(tag);
      const category = match?.category ?? 'concept';
      const catalogSkillId = match?.skillId ?? null;
      exec(
        'project_db',
        `INSERT INTO project_skills (id, project_id, name, catalog_skill_id, category, is_mandatory, display_order, created_at)
         VALUES (gen_random_uuid(), '${projectId}', ${sqlString(tag)}, ${catalogSkillId ? `'${catalogSkillId}'` : 'NULL'}, '${category}', false, 0, now())
         ON CONFLICT (project_id, name) DO NOTHING`,
      );
    }
    console.log(`${rows.length} tags migrados a project_skills (isMandatory=false por ser tags, no requisitos).`);
  }

  exec('project_db', 'DROP TABLE IF EXISTS project_tags');
  console.log('Tabla project_tags eliminada.');
}

async function migrateSkillRequirements() {
  console.log('\n== 3. Copiar project_requirements(type=skill) -> project_skills ==');
  const rows = psql(
    'project_db',
    "SELECT project_id, name, is_mandatory, proficiency_level FROM project_requirements WHERE requirement_type = 'skill'",
  );
  if (!rows.length) {
    console.log('No hay requirements de tipo skill.');
    return;
  }

  const uniqueNames = [...new Set(rows.map((r) => r[1]))];
  console.log(`Resolviendo ${uniqueNames.length} nombres de requirement contra el catálogo...`);
  const resolved = await resolveSkillNames(uniqueNames);

  for (const [projectId, name, isMandatoryRaw, proficiencyRaw] of rows) {
    const match = resolved.get(name);
    const category = match?.category ?? 'concept';
    const catalogSkillId = match?.skillId ?? null;
    const isMandatory = isMandatoryRaw === 't' || isMandatoryRaw === 'true';
    const proficiency = VALID_PROFICIENCY.has((proficiencyRaw || '').toLowerCase())
      ? `'${proficiencyRaw.toLowerCase()}'`
      : 'NULL';

    exec(
      'project_db',
      `INSERT INTO project_skills (id, project_id, name, catalog_skill_id, category, proficiency_level, is_mandatory, display_order, created_at)
       VALUES (gen_random_uuid(), '${projectId}', ${sqlString(name)}, ${catalogSkillId ? `'${catalogSkillId}'` : 'NULL'}, '${category}', ${proficiency}, ${isMandatory}, 0, now())
       ON CONFLICT (project_id, name) DO NOTHING`,
    );
  }
  console.log(`${rows.length} requirements de tipo skill copiados a project_skills (los originales NO se borran).`);
}

async function backfillProjectSkillsCatalog() {
  console.log('\n== 4. Backfill catalog_skill_id en project_db.project_skills ==');
  const rows = psql('project_db', 'SELECT DISTINCT name FROM project_skills WHERE catalog_skill_id IS NULL');
  const names = rows.map((r) => r[0]).filter(Boolean);
  if (!names.length) {
    console.log('Nada que resolver.');
    return;
  }
  console.log(`Resolviendo ${names.length} nombres de habilidad contra el catálogo...`);
  const resolved = await resolveSkillNames(names);
  let updated = 0;
  for (const name of names) {
    const match = resolved.get(name);
    if (match?.skillId) {
      exec('project_db', `UPDATE project_skills SET catalog_skill_id = '${match.skillId}' WHERE name = ${sqlString(name)} AND catalog_skill_id IS NULL`);
      updated++;
    }
  }
  console.log(`${updated}/${names.length} nombres vinculados al catálogo.`);
}

async function migrateAcademicPrograms() {
  console.log('\n== 5. Convertir projects.academic_programs de texto a UUIDs ==');
  const programs = psql('admin_db', 'SELECT id, name FROM academic_programs');
  const nameToId = new Map(programs.map(([id, name]) => [name.toLowerCase().trim(), id]));

  const rows = psql('project_db', "SELECT id, academic_programs FROM projects WHERE academic_programs IS NOT NULL AND academic_programs != ''");
  if (!rows.length) {
    console.log('No hay proyectos con academic_programs para migrar.');
    return;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let touched = 0;
  let unmatchedNames = new Set();

  for (const [projectId, value] of rows) {
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.every((p) => uuidRegex.test(p))) continue; // ya migrado

    const ids = [];
    for (const part of parts) {
      if (uuidRegex.test(part)) {
        ids.push(part);
        continue;
      }
      const id = nameToId.get(part.toLowerCase().trim());
      if (id) ids.push(id);
      else unmatchedNames.add(part);
    }

    if (ids.length) {
      exec('project_db', `UPDATE projects SET academic_programs = '${ids.join(',')}' WHERE id = '${projectId}'`);
      touched++;
    } else {
      exec('project_db', `UPDATE projects SET academic_programs = NULL WHERE id = '${projectId}'`);
      touched++;
    }
  }

  console.log(`${touched} proyectos actualizados.`);
  if (unmatchedNames.size) {
    // console.log (no console.warn/error): resultado informativo esperado, no una falla del
    // proceso — PowerShell con $ErrorActionPreference="Stop" trata cualquier línea de stderr
    // de un proceso nativo como error terminante aunque el exit code sea 0.
    console.log(
      `Advertencia: ${unmatchedNames.size} nombres de programa no se encontraron en admin_db.academic_programs y fueron descartados: ${[...unmatchedNames].join(', ')}`,
    );
    console.log('Crea esos programas en el catálogo (POST /api/v1/admin/programs) y vuelve a correr el script para vincularlos.');
  }
}

async function main() {
  console.log(`Migración skills/tags — ${DRY_RUN ? 'DRY RUN (sin escribir cambios)' : 'ejecutando cambios'}`);
  await migrateStudentSkillsCatalog();
  await migrateProjectTags();
  await migrateSkillRequirements();
  await backfillProjectSkillsCatalog();
  await migrateAcademicPrograms();
  console.log('\nMigración completa.');
}

main().catch((err) => {
  console.error('Error en la migración:', err);
  process.exit(1);
});
