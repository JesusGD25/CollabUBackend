#!/usr/bin/env node
/**
 * ESTADO DE LA DEMO: guarda y restaura lo que la demostración modifica en vivo, para poder ensayarla y repetirla.
 *
 * Qué toca la demo (GUION_DEMO_20_MINUTOS.md):
 *   · Tatiana Mesa se postula a un proyecto (nueva postulación).
 *   · Admin de Sistemas asigna un asesor a la postulación aceptada de Ricardo Chaves.
 *   · La docente Marta Ríos acepta la asignación de Ángela Cuaspud (el proyecto inicia y se descartan sus otras postulaciones).
 *   · Notificaciones y chat que se generan en el camino.
 *
 * Uso:
 *   node demo-state.mjs save      Guarda el estado actual (hazlo UNA vez, con el seed ya cargado y verificado).
 *   node demo-state.mjs restore   Vuelve a ese estado (después de cada ensayo o presentación).
 *   node demo-state.mjs status    Muestra si hay un estado guardado y qué diferencias hay.
 *
 * El estado se guarda en Backend/backups/demo-state.json. Solo afecta a las cuentas de la demo.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, '..', 'backups', 'demo-state.json');
const CONTAINER = process.env.POSTGRES_CONTAINER || 'collab-u-postgres';
const DEMO_STUDENTS = ['tatiana.mesa', 'angela.cuaspud', 'ricardo.chaves'].map((h) => `${h}@collabu.dev`);
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const list = (ids) => (ids.length ? ids.map(quote).join(', ') : 'NULL');

function psql(db, sql, { input = false } = {}) {
  const args = ['exec', '-i', '-e', 'PGCLIENTENCODING=UTF8', CONTAINER, 'psql', '-U', 'collabu_admin', '-d', db, '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A'];
  if (!input) args.push('-c', sql);
  return execFileSync('docker', args, { input: input ? sql : undefined, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024 }).trim();
}
const rows = (db, sql) => psql(db, sql).split('\n').filter(Boolean);
const tablesWith = (db, column) => rows(db, `SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='${column}'`);
const json = (db, table, where) => JSON.parse(psql(db, `SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT * FROM "${table}" WHERE ${where}) t`));

function scope() {
  const users = rows('auth_db', `SELECT id FROM users WHERE email IN (${list(DEMO_STUDENTS)})`);
  const apps = rows('application_db', `SELECT id FROM applications WHERE student_id IN (${list(users)})`);
  return { users, apps };
}

function collect() {
  const { users, apps } = scope();
  const out = { savedAt: new Date().toISOString(), users, apps, tables: [] };
  const add = (db, table, where) => out.tables.push({ db, table, where, rows: json(db, table, where) });

  const appTables = tablesWith('application_db', 'application_id').filter((t) => t !== 'applications');
  const projectIds = apps.length ? rows('application_db', `SELECT DISTINCT project_id FROM applications WHERE id IN (${list(apps)})`) : [];
  const subs = apps.length ? rows('application_db', `SELECT id FROM academic_submissions WHERE application_id IN (${list(apps)})`) : [];
  const dels = apps.length ? rows('application_db', `SELECT id FROM student_deliverables WHERE application_id IN (${list(apps)})`) : [];
  const asgs = apps.length ? rows('admin_db', `SELECT id FROM supervisor_assignments WHERE application_id::text IN (${list(apps)})`) : [];

  add('application_db', 'applications', `id IN (${list(apps)})`);
  for (const t of appTables) add('application_db', t, `application_id::text IN (${list(apps)})`);
  if (subs.length) add('application_db', 'submission_history', `submission_id IN (${list(subs)})`);
  if (dels.length) { add('application_db', 'deliverable_attachments', `deliverable_id::text IN (${list(dels)})`); add('application_db', 'deliverable_comments', `deliverable_id::text IN (${list(dels)})`); }
  add('admin_db', 'supervisor_assignments', `application_id::text IN (${list(apps)})`);
  if (asgs.length) add('admin_db', 'supervisor_assignment_history', `assignment_id IN (${list(asgs)})`);
  // NO se guardan ni se borran filas de `projects`: tienen hijos con ON DELETE CASCADE (habilidades, entregables…).
  // Solo se recalculan sus cupos al restaurar.
  out.projectIds = projectIds;
  // Empresas pendientes de verificar (la demo del admin puede aprobar o rechazar una): se restauran con UPDATE.
  out.pendingCompanies = JSON.parse(psql('company_db', `SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT id, verification_status, reviewed_by, reviewed_at, is_active FROM companies WHERE verification_status = 'pending') t`));
  // Columnas del proyecto que cambian con el flujo (estado y cupos); se restauran con UPDATE.
  out.projectCols = projectIds.length ? JSON.parse(psql('project_db', `SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT id, status, positions_filled, applications_count, is_active FROM projects WHERE id IN (${list(projectIds)})) t`)) : [];
  return out;
}

function restore(state) {
  const { users } = scope();
  // 1) Postulaciones creadas durante la demo (no existían al guardar): se eliminan con todo lo que cuelga de ellas.
  const now = rows('application_db', `SELECT id FROM applications WHERE student_id IN (${list(users)})`);
  const fresh = now.filter((id) => !state.apps.includes(id));
  if (fresh.length) {
    const appTables = tablesWith('application_db', 'application_id').filter((t) => t !== 'applications');
    for (const t of appTables) psql('application_db', `DELETE FROM "${t}" WHERE application_id::text IN (${list(fresh)})`);
    psql('application_db', `DELETE FROM applications WHERE id IN (${list(fresh)})`);
    psql('admin_db', `DELETE FROM supervisor_assignment_history WHERE assignment_id IN (SELECT id FROM supervisor_assignments WHERE application_id::text IN (${list(fresh)}))`);
    psql('admin_db', `DELETE FROM supervisor_assignments WHERE application_id::text IN (${list(fresh)})`);
  }
  // 2) Todo lo guardado: se borra el estado actual de esas filas y se reinsertan las guardadas (en orden inverso al de guardado para borrar).
  const dbOf = (t) => t.db;
  const current = collect();
  for (const t of [...current.tables].reverse()) {
    // si la tabla hija depende de filas que ya no existen, se borra por las mismas condiciones calculadas ahora
    psql(dbOf(t), `DELETE FROM "${t.table}" WHERE ${t.where}`);
  }
  // (las filas guardadas pueden tener ids que hoy no cumplen la condición recalculada: se borran también por id)
  for (const t of [...state.tables].reverse()) {
    const ids = t.rows.map((r) => r.id).filter(Boolean);
    if (ids.length) psql(dbOf(t), `DELETE FROM "${t.table}" WHERE id::text IN (${list(ids)})`);
  }
  for (const t of state.tables) {
    if (!t.rows.length) continue;
    const payload = JSON.stringify(t.rows).replace(/'/g, "''");
    psql(dbOf(t), `INSERT INTO "${t.table}" SELECT * FROM json_populate_recordset(null::"${t.table}", '${payload}'::json) ON CONFLICT DO NOTHING`);
  }
  // 3) Notificaciones y mensajes generados después de guardar.
  const since = state.savedAt;
  const n = psql('notification_db', `WITH d AS (DELETE FROM notifications WHERE created_at > ${quote(since)} RETURNING 1) SELECT count(*) FROM d`);
  const m = psql('chat_db', `WITH d AS (DELETE FROM messages WHERE created_at > ${quote(since)} RETURNING 1) SELECT count(*) FROM d`);
  // 3b) Empresas que estaban pendientes de verificación.
  for (const c of state.pendingCompanies || []) {
    psql('company_db', `UPDATE companies SET verification_status = ${quote(c.verification_status)}, reviewed_by = ${c.reviewed_by ? quote(c.reviewed_by) : 'NULL'}, reviewed_at = ${c.reviewed_at ? quote(c.reviewed_at) : 'NULL'}, is_active = ${c.is_active} WHERE id = ${quote(c.id)}`);
  }
  // 4) Estado y cupos de los proyectos afectados (UPDATE: nunca se borran proyectos).
  for (const p of state.projectCols || []) {
    psql('project_db', `UPDATE projects SET status = ${quote(p.status)}, positions_filled = ${p.positions_filled}, applications_count = ${p.applications_count}, is_active = ${p.is_active} WHERE id = ${quote(p.id)}`);
  }
  console.log(`Estado restaurado (${state.apps.length} postulaciones guardadas, ${fresh.length} nuevas eliminadas, ${n} notificaciones y ${m} mensajes posteriores eliminados).`);
}

const cmd = process.argv[2];
if (cmd === 'save') {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const state = collect();
  fs.writeFileSync(FILE, JSON.stringify(state));
  console.log(`Estado guardado en ${FILE}: ${state.apps.length} postulaciones, ${state.tables.reduce((a, t) => a + t.rows.length, 0)} filas en ${state.tables.filter((t) => t.rows.length).length} tablas.`);
} else if (cmd === 'restore') {
  if (!fs.existsSync(FILE)) { console.error('No hay estado guardado: ejecuta primero `node demo-state.mjs save`.'); process.exit(1); }
  restore(JSON.parse(fs.readFileSync(FILE, 'utf-8')));
} else if (cmd === 'status') {
  if (!fs.existsSync(FILE)) { console.log('Sin estado guardado.'); process.exit(0); }
  const state = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  const now = scope();
  console.log(`Guardado ${state.savedAt}: ${state.apps.length} postulaciones. Ahora: ${now.apps.length}.`);
} else {
  console.log('Uso: node demo-state.mjs save | restore | status');
  process.exit(1);
}
