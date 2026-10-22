#!/usr/bin/env node
/**
 * ARREGLOS DE LA CAPA "DEPARTAMENTOS" sobre el seed base + showcase (idempotente).
 *
 * Se ejecuta DESPUÉS de `Run-Seed.ps1` y `Run-Seed-Showcase.ps1`, y deja los datos coherentes con el
 * modelo de departamentos (PLANNING_ADMIN_DEPARTAMENTOS_Y_AJUSTES.md §8–§9):
 *   1. Retira cuentas de prueba (e2e.*, nuevo.estudiante.*), con todo lo que cuelga de ellas.
 *   2. Sin estudiantes "Industrial": student02 → Electrónica y student07 → Civil (se conservan porque
 *      son escenarios protegidos del matching); student12 y student16 se retiran con sus dependientes.
 *   3. Respalda el departamento (program_id) en postulaciones y asignaciones que no lo tengan, y
 *      completa program_ids de las empresas y el departamento de los docentes.
 *   4. Evaluaciones sembradas en escala 1–5 → escala real 0–100 (idempotente).
 *
 * Uso: node seed-departments-fixups.mjs [--container collab-u-postgres] [--dry-run]
 *   Las cuentas cuyo correo no termina en @collabu.dev (p. ej. la del autor) NUNCA se tocan.
 */
import { execFileSync } from 'node:child_process';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const CONTAINER = arg('--container', process.env.POSTGRES_CONTAINER || 'collab-u-postgres');
const PGUSER = process.env.POSTGRES_USER || 'collabu_admin';
const DRY = process.argv.includes('--dry-run');
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const list = (ids) => (ids.length ? ids.map(quote).join(', ') : 'NULL');

function q(db, sql) {
  const out = execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', PGUSER, '-d', db, '-t', '-A', '-F', '\t', '-c', sql], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean).map((l) => l.split('\t'));
}
let writes = 0;
function run(db, sql, label) {
  if (!sql.trim()) return 0;
  if (DRY) { console.log(`  [dry-run] ${db}: ${label || sql.slice(0, 80)}`); return 0; }
  const out = execFileSync('docker', ['exec', '-i', '-e', 'PGCLIENTENCODING=UTF8', CONTAINER, 'psql', '-U', PGUSER, '-d', db, '-v', 'ON_ERROR_STOP=1', '-q', '-t', '-A', '-c', sql], { encoding: 'utf-8' });
  writes++;
  const m = out.match(/\d+/);
  return m ? Number(m[0]) : 0;
}
const tablesWith = (db, column) => q(db, `SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='${column}'`).map((r) => r[0]);
const del = (db, table, where) => run(db, `WITH d AS (DELETE FROM "${table}" WHERE ${where} RETURNING 1) SELECT count(*) FROM d`, `DELETE ${table}`);

console.log(`Fixups de departamentos · contenedor=${CONTAINER}${DRY ? ' · DRY-RUN' : ''}`);

// ───────────────────────────── Programas ─────────────────────────────
const progs = Object.fromEntries(q('admin_db', "SELECT code, id, name FROM academic_programs WHERE code IN ('ING-SIS','ING-ELE','ING-CIV')").map(([c, id, name]) => [c.replace('ING-', ''), { id, name }]));
if (Object.keys(progs).length !== 3) { console.error('Faltan programas ING-SIS/ELE/CIV: ¿arrancó admin-service?'); process.exit(2); }

// ───────────────────────────── Purga de usuarios ─────────────────────────────
function purgeUsers(emails, why) {
  const users = q('auth_db', `SELECT id, email, role FROM users WHERE lower(email) = ANY(ARRAY[${emails.map((e) => quote(e.toLowerCase())).join(',')}]) AND email LIKE '%@collabu.dev'`);
  if (!users.length) return;
  console.log(`  · ${why}: ${users.map((u) => u[1]).join(', ')}`);
  const ids = users.map((u) => u[0]);

  // application_db: postulaciones del estudiante y todo lo que cuelga de ellas
  const apps = q('application_db', `SELECT id, project_id FROM applications WHERE student_id IN (${list(ids)})`);
  const appIds = apps.map((a) => a[0]);
  const entityIds = [];
  if (appIds.length) {
    const subs = q('application_db', `SELECT id FROM academic_submissions WHERE application_id IN (${list(appIds)})`).map((r) => r[0]);
    const dels = q('application_db', `SELECT id FROM student_deliverables WHERE application_id IN (${list(appIds)})`).map((r) => r[0]);
    const docs = q('application_db', `SELECT id FROM project_documents WHERE application_id IN (${list(appIds)})`).map((r) => r[0]);
    const recs = q('application_db', `SELECT id FROM project_academic_records WHERE application_id IN (${list(appIds)})`).map((r) => r[0]);
    const sels = q('application_db', `SELECT id FROM selection_document_requests WHERE application_id IN (${list(appIds)})`).map((r) => r[0]);
    entityIds.push(...subs, ...dels, ...docs, ...recs, ...sels);
    if (subs.length) del('application_db', 'submission_history', `submission_id IN (${list(subs)})`);
    if (dels.length) { del('application_db', 'deliverable_attachments', `deliverable_id IN (${list(dels)})`); del('application_db', 'deliverable_comments', `deliverable_id IN (${list(dels)})`); }
    for (const t of tablesWith('application_db', 'application_id')) if (t !== 'applications') del('application_db', t, `application_id::text IN (${list(appIds)})`);
    del('application_db', 'applications', `id IN (${list(appIds)})`);
    // admin_db
    const asgs = q('admin_db', `SELECT id FROM supervisor_assignments WHERE application_id::text IN (${list(appIds)}) OR student_id::text IN (${list(ids)})`).map((r) => r[0]);
    if (asgs.length) { del('admin_db', 'supervisor_assignment_history', `assignment_id IN (${list(asgs)})`); del('admin_db', 'supervisor_assignments', `id IN (${list(asgs)})`); }
    // evaluation_db
    const evs = q('evaluation_db', `SELECT id FROM evaluations WHERE application_id IN (${list(appIds)})`).map((r) => r[0]);
    if (evs.length) { del('evaluation_db', 'evaluation_ratings', `evaluation_id IN (${list(evs)})`); del('evaluation_db', 'evaluations', `id IN (${list(evs)})`); }
    // proyectos: recalcula cupos y contador de postulaciones
    for (const pid of [...new Set(apps.map((a) => a[1]))]) {
      const [[filled, total]] = q('application_db', `SELECT count(*) FILTER (WHERE status IN ('in_progress','completed')), count(*) FROM applications WHERE project_id = ${quote(pid)}`);
      run('project_db', `UPDATE projects SET positions_filled = ${filled}, applications_count = ${total} WHERE id = ${quote(pid)}`, 'recalcular cupos');
    }
  }
  // Estudiante
  const profs = q('student_db', `SELECT id FROM student_profiles WHERE user_id IN (${list(ids)})`).map((r) => r[0]);
  if (profs.length) {
    for (const t of tablesWith('student_db', 'student_id')) del('student_db', t, `student_id IN (${list(profs)})`);
    del('student_db', 'student_profiles', `id IN (${list(profs)})`);
  }
  // Empresa
  const cos = q('company_db', `SELECT id FROM companies WHERE user_id IN (${list(ids)})`).map((r) => r[0]);
  if (cos.length) {
    for (const t of tablesWith('company_db', 'company_id')) del('company_db', t, `company_id IN (${list(cos)})`);
    del('company_db', 'companies', `id IN (${list(cos)})`);
    del('admin_db', 'company_verifications', `company_id IN (${list(cos)})`);
  }
  // Docente
  const sups = q('admin_db', `SELECT id FROM supervisors WHERE user_id IN (${list(ids)})`).map((r) => r[0]);
  if (sups.length) {
    const asgs = q('admin_db', `SELECT id FROM supervisor_assignments WHERE supervisor_id IN (${list(sups)})`).map((r) => r[0]);
    if (asgs.length) { del('admin_db', 'supervisor_assignment_history', `assignment_id IN (${list(asgs)})`); del('admin_db', 'supervisor_assignments', `id IN (${list(asgs)})`); }
    del('admin_db', 'supervisors', `id IN (${list(sups)})`);
  }
  // Archivos, notificaciones, chat, perfil y cuenta
  del('storage_db', 'files', `owner_id::text IN (${list(ids)})${entityIds.length ? ` OR entity_id::text IN (${list(entityIds)})` : ''}`);
  del('notification_db', 'notifications', `user_id IN (${list(ids)})`);
  del('chat_db', 'messages', `sender_id IN (${list(ids)})`);
  del('chat_db', 'conversation_participants', `user_id IN (${list(ids)})`);
  for (const t of tablesWith('user_db', 'user_id')) del('user_db', t, `user_id::text IN (${list(ids)})`);
  for (const t of tablesWith('auth_db', 'user_id')) del('auth_db', t, `user_id::text IN (${list(ids)})`);
  del('auth_db', 'users', `id IN (${list(ids)})`);
}

console.log('\n1) Cuentas de prueba');
{
  const test = q('auth_db', "SELECT email FROM users WHERE email LIKE '%@collabu.dev' AND (email LIKE 'e2e.%' OR email LIKE 'nuevo.estudiante.%')").map((r) => r[0]);
  if (test.length) purgeUsers(test, 'se retiran'); else console.log('  (ninguna)');
}

console.log('\n2) Estudiantes "Industrial"');
{
  // student02 y student07 se conservan (escenarios protegidos de matching): pasan a un programa real.
  const move = { 'student02@collabu.dev': 'ELE', 'student07@collabu.dev': 'CIV' };
  for (const [email, key] of Object.entries(move)) {
    const [[uid_] = []] = q('auth_db', `SELECT id FROM users WHERE email = ${quote(email)}`);
    if (!uid_) continue;
    const changed = run('student_db', `WITH u AS (UPDATE student_profiles SET program = ${quote(progs[key].name)}, program_id = ${quote(progs[key].id)} WHERE user_id = ${quote(uid_)} AND (program_id IS DISTINCT FROM ${quote(progs[key].id)}) RETURNING 1) SELECT count(*) FROM u`, `${email} → ${key}`);
    if (changed) console.log(`  · ${email} → ${progs[key].name}`);
  }
  // student12 y student16 se retiran con sus dependientes.
  purgeUsers(['student12@collabu.dev', 'student16@collabu.dev'], 'se retiran');
}

console.log('\n3) Departamento en postulaciones, asignaciones, empresas y docentes');
{
  const stDept = Object.fromEntries(q('student_db', 'SELECT user_id, program_id FROM student_profiles WHERE program_id IS NOT NULL'));
  const apps = q('application_db', 'SELECT id, student_id, program_id FROM applications');
  const fix = apps.filter(([, st, p]) => stDept[st] && p !== stDept[st]);
  if (fix.length) {
    const byProg = {};
    for (const [id, st] of fix) (byProg[stDept[st]] ||= []).push(id);
    for (const [pid, ids] of Object.entries(byProg)) run('application_db', `UPDATE applications SET program_id = ${quote(pid)} WHERE id IN (${list(ids)})`, 'applications.program_id');
    console.log(`  · ${fix.length} postulaciones con departamento corregido`);
  }
  const appDept = Object.fromEntries(q('application_db', 'SELECT id, program_id FROM applications WHERE program_id IS NOT NULL'));
  const asg = q('admin_db', 'SELECT id, application_id, program_id FROM supervisor_assignments').filter(([, a, p]) => appDept[a] && p !== appDept[a]);
  if (asg.length) {
    const byProg = {};
    for (const [id, a] of asg) (byProg[appDept[a]] ||= []).push(id);
    for (const [pid, ids] of Object.entries(byProg)) run('admin_db', `UPDATE supervisor_assignments SET program_id = ${quote(pid)} WHERE id IN (${list(ids)})`, 'assignments.program_id');
    console.log(`  · ${asg.length} asignaciones con departamento corregido`);
  }
  // Empresas del seed base y del showcase sin departamento
  const coProg = { 'company01@collabu.dev': 'SIS', 'company02@collabu.dev': 'SIS', 'company03@collabu.dev': 'ELE', 'empresa.andestech@collabu.dev': 'SIS', 'empresa.agronarino@collabu.dev': 'SIS,ELE', 'empresa.cimientos@collabu.dev': 'CIV', 'empresa.volcan@collabu.dev': 'ELE' };
  for (const [email, keys] of Object.entries(coProg)) {
    const [[uid_] = []] = q('auth_db', `SELECT id FROM users WHERE email = ${quote(email)}`);
    if (!uid_) continue;
    const arr = keys.split(',').map((k) => quote(progs[k].id)).join(', ');
    const n = run('company_db', `WITH u AS (UPDATE companies SET program_ids = ARRAY[${arr}]::uuid[] WHERE user_id = ${quote(uid_)} AND (program_ids IS NULL OR cardinality(program_ids) = 0) RETURNING 1) SELECT count(*) FROM u`, `program_ids ${email}`);
    if (n) console.log(`  · ${email} → ${keys}`);
  }
  // Docentes sin departamento: se deduce por el nombre del departamento
  for (const [key, p] of Object.entries(progs)) {
    run('admin_db', `UPDATE supervisors SET program_id = ${quote(p.id)} WHERE program_id IS NULL AND lower(department) LIKE ${quote('%' + p.name.toLowerCase().replace('ingeniería de ', '').replace('ingeniería ', '') + '%')}`, `supervisors.program_id ${key}`);
  }
  // Proyectos sin departamento: se asumen de Sistemas (seed base)
  run('project_db', `UPDATE projects SET academic_programs = ${quote(progs.SIS.id)} WHERE academic_programs IS NULL OR academic_programs = ''`, 'projects.academic_programs');
}

console.log('\n4) Evaluaciones en escala 0–100');
{
  const e = run('evaluation_db', "WITH u AS (UPDATE evaluations SET overall_score = overall_score * 20 WHERE overall_score > 0 AND overall_score <= 5 RETURNING 1) SELECT count(*) FROM u", 'evaluations x20');
  const r = run('evaluation_db', "WITH u AS (UPDATE evaluation_ratings SET score = score * 20 WHERE score > 0 AND score <= 5 RETURNING 1) SELECT count(*) FROM u", 'ratings x20');
  console.log(`  · ${e} evaluaciones y ${r} calificaciones reescaladas`);
}

console.log('\n4b) Asignaciones en estado heredado `active`');
{
  // Ningún flujo produce `active` (aceptar deja `accepted`) y las vistas del docente solo listan `accepted`.
  const n = run('admin_db', "WITH u AS (UPDATE supervisor_assignments SET status = 'accepted' WHERE status = 'active' RETURNING 1) SELECT count(*) FROM u", 'active → accepted');
  console.log(`  · ${n ? `${n} asignaciones pasadas de active a accepted` : 'ninguna'}`);
}

console.log('\n4f) Estudiante «sin proyecto» de la demostración');
{
  // Tatiana Mesa es la estudiante que se postula en vivo: debe cumplir el semestre mínimo (8.º) de los proyectos que
  // el sistema le recomienda; de lo contrario la postulación se rechaza con 400.
  const [[tid] = []] = q('auth_db', "SELECT id FROM users WHERE email = 'tatiana.mesa@collabu.dev'");
  if (tid) {
    const n = run('student_db', `WITH u AS (UPDATE student_profiles SET semester = 8, enrollment_year = 2023, expected_graduation_year = 2027, total_credits_completed = 112 WHERE user_id = ${quote(tid)} AND semester <> 8 RETURNING 1) SELECT count(*) FROM u`, 'tatiana semestre 8');
    console.log(`  · ${n ? 'Tatiana Mesa pasa a 8.º semestre' : 'ya está en 8.º semestre'}`);
  }
}

console.log('\n4g) Evaluaciones abiertas de proyectos en cierre');
{
  // evaluation-service vence cada hora las evaluaciones `pending` con due_date pasado. Si el seed se cargó días
  // antes (ON CONFLICT DO NOTHING conserva la fecha vieja), las abiertas del cierre quedan vencidas: se reabren.
  const apps = q('application_db', "SELECT application_id FROM project_academic_records WHERE status IN ('finalizing','final_docs_review')").map((r) => r[0]);
  if (apps.length) {
    const list = apps.map((a) => `'${a}'`).join(',');
    const n = run('evaluation_db', `WITH u AS (UPDATE evaluations SET status = 'pending', due_date = now() + interval '10 days' WHERE application_id IN (${list}) AND completed_at IS NULL AND evaluation_type <> 'self_evaluation' AND (status = 'expired' OR (status = 'pending' AND due_date < now() + interval '3 days')) RETURNING 1) SELECT count(*) FROM u`, 'evaluaciones de cierre reabiertas');
    console.log(`  · ${n} evaluaciones de cierre reabiertas/renovadas`);
  }
}

console.log('\n4e) Cuentas bloqueadas del seed');
{
  // El bloqueo por intentos fallidos vence con el tiempo: se renueva para que el caso de demostración siga vigente.
  const n = run('auth_db', "WITH u AS (UPDATE users SET locked_until = now() + interval '30 days' WHERE failed_login_attempts >= 5 AND email LIKE '%@collabu.dev' AND (locked_until IS NULL OR locked_until < now() + interval '25 days') RETURNING 1) SELECT count(*) FROM u", 'renovar bloqueo');
  console.log(`  · ${n} cuentas con el bloqueo renovado (30 días)`);
}

console.log('\n4d) Postulaciones «aceptadas» que ya tienen asesor');
{
  // «Aceptada» significa que la postulación espera asesor (es lo que lista la cola de asignación). Si ya tiene un asesor
  // aceptado o su proceso terminó, el flujo real la deja en `in_progress`/`completed`; el seed base las dejó en `accepted`,
  // lo que llenaba la cola de asesores con casos ya resueltos.
  const withAdvisor = new Set(q('admin_db', "SELECT application_id FROM supervisor_assignments WHERE role = 'asesor' AND status IN ('accepted', 'completed')").map((r) => r[0]));
  const stale = q('application_db', "SELECT id FROM applications WHERE status = 'accepted'").map((r) => r[0]).filter((id) => withAdvisor.has(id));
  if (stale.length) {
    run('application_db', `UPDATE applications SET status = 'in_progress', updated_at = now() WHERE id IN (${list(stale)})`, 'accepted → in_progress');
  }
  console.log(`  · ${stale.length} postulaciones pasadas de accepted a in_progress`);
}

console.log('\n4c) Notificaciones duplicadas');
{
  // Una misma notificación (usuario, tipo, título y mensaje) no se repite: se conserva la más antigua.
  const n = run('notification_db', "WITH d AS (DELETE FROM notifications a USING notifications b WHERE a.user_id = b.user_id AND a.type = b.type AND a.title = b.title AND a.message = b.message AND (a.created_at, a.id) > (b.created_at, b.id) RETURNING 1) SELECT count(*) FROM d", 'dedup notifications');
  console.log(`  · ${n} duplicadas eliminadas`);
}

console.log('\n5) Fixture del e2e de matching (proyecto sin skills)');
{
  // matching-integration.e2e-spec.ts (protegido) espera que este proyecto NO tenga habilidades.
  const FIXTURE = '9f8ace78-f0a6-4a8b-8d69-536340f84415';
  const n = del('project_db', 'project_skills', `project_id = ${quote(FIXTURE)}`);
  console.log(`  · ${n ? `${n} habilidades retiradas de «App Móvil de Fidelización»` : 'ya está sin habilidades'}`);
}

console.log(`\nListo${DRY ? ' (dry-run: no se modificó nada)' : ''}.`);
