#!/usr/bin/env node
/**
 * VERIFICADOR DE COBERTURA DEL SEED (PLANNING_ADMIN_DEPARTAMENTOS_Y_AJUSTES.md §8.3 / §8.5).
 *
 * Lee la base de datos REAL (contenedor Postgres) y comprueba, por departamento
 * (Sistemas / Electrónica / Civil) y en global, que cada entidad tenga representado cada estado
 * que la demo necesita. Imprime una tabla por entidad y termina con código de salida 1 si falta algo.
 *
 * Uso:  node verify-seed-coverage.mjs [--container collab-u-postgres] [--quiet]
 */
import { execFileSync } from 'node:child_process';

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const CONTAINER = arg('--container', process.env.POSTGRES_CONTAINER || 'collab-u-postgres');
const QUIET = process.argv.includes('--quiet');
const PGUSER = process.env.POSTGRES_USER || 'collabu_admin';

function q(db, sql) {
  const out = execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', PGUSER, '-d', db, '-t', '-A', '-F', '\t', '-c', sql], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean).map((l) => l.split('\t'));
}

const DEPTS = ['SIS', 'ELE', 'CIV'];
const DEPT_NAME = { SIS: 'Sistemas', ELE: 'Electrónica', CIV: 'Civil' };
const progRows = q('admin_db', "SELECT code, id FROM academic_programs WHERE code IN ('ING-SIS','ING-ELE','ING-CIV')");
const idOf = Object.fromEntries(progRows.map(([code, id]) => [code.replace('ING-', ''), id]));
const deptOfId = Object.fromEntries(Object.entries(idOf).map(([k, v]) => [v, k]));
for (const d of DEPTS) if (!idOf[d]) { console.error(`Falta el programa ING-${d}`); process.exit(2); }

const failures = [];
const warnings = [];
const lines = [];
const out = (s = '') => lines.push(s);
const need = (ok, msg) => { if (!ok) failures.push(msg); };
const pad = (s, n) => String(s).padEnd(n);

/** Imprime una matriz fila=estado, columna=departamento (+ global). `required`: estados que no pueden ser 0 por departamento. */
function matrix(title, states, counts, { required = [], requiredGlobal = [] } = {}) {
  out(`\n■ ${title}`);
  out(`  ${pad('estado', 24)}${DEPTS.map((d) => pad(DEPT_NAME[d], 13)).join('')}${pad('Facultad*', 11)}total`);
  for (const s of states) {
    const row = counts[s] || {};
    const per = DEPTS.map((d) => row[d] || 0);
    const none = row.NONE || 0;
    const total = per.reduce((a, b) => a + b, 0) + none;
    const mark = (n, isReq) => (n === 0 && isReq ? `${n}!`.padEnd(13) : String(n).padEnd(13));
    out(`  ${pad(s, 24)}${DEPTS.map((d, i) => mark(per[i], required.includes(s))).join('')}${pad(none, 11)}${total}`);
    if (required.includes(s)) DEPTS.forEach((d, i) => need(per[i] > 0, `${title}: ${DEPT_NAME[d]} no tiene "${s}"`));
    if (requiredGlobal.includes(s)) need(total > 0, `${title}: ningún registro en estado "${s}"`);
  }
  const unknown = Object.keys(counts).filter((s) => !states.includes(s));
  if (unknown.length) warnings.push(`${title}: estados no contemplados en la matriz: ${unknown.join(', ')}`);
}
function tally(rows, keyIdx, deptIdx) {
  const t = {};
  for (const r of rows) {
    const s = r[keyIdx];
    const d = deptOfId[r[deptIdx]] || 'NONE';
    ((t[s] ||= {})[d] = (t[s][d] || 0) + 1);
  }
  return t;
}

// ───────────────────────────── Datos base ─────────────────────────────
const apps = q('application_db', 'SELECT id, status, program_id FROM applications');
const appDept = Object.fromEntries(apps.map(([id, , p]) => [id, deptOfId[p] || 'NONE']));
const byApp = (rows, idIdx) => rows.map((r) => ({ r, d: appDept[r[idIdx]] || 'NONE' }));
const tallyApp = (rows, keyIdx, appIdx) => {
  const t = {};
  for (const { r, d } of byApp(rows, appIdx)) ((t[r[keyIdx]] ||= {})[d] = (t[r[keyIdx]][d] || 0) + 1);
  return t;
};

// ───────────────────────────── 1. Cuentas ─────────────────────────────
{
  const users = q('auth_db', 'SELECT role, is_verified, is_active, (locked_until IS NOT NULL AND locked_until > now()) AS locked, admin_level, department_id FROM users');
  out('■ Cuentas');
  const count = (f) => users.filter(f).length;
  const rows = [
    ['email sin verificar', count((u) => u[1] === 'f'), true],
    ['cuenta inactiva', count((u) => u[2] === 'f'), true],
    ['bloqueada por intentos', count((u) => u[3] === 't'), true],
    ['superadmin (Facultad)', count((u) => u[0] === 'admin' && (u[4] === '' || u[4] === 'super')), true],
  ];
  for (const [label, n, req] of rows) { out(`  ${pad(label, 28)}${n}${n === 0 && req ? '!' : ''}`); if (req) need(n > 0, `Cuentas: falta ${label}`); }
  for (const d of DEPTS) {
    const n = count((u) => u[0] === 'admin' && u[4] === 'department' && u[5] === idOf[d]);
    out(`  ${pad('admin de ' + DEPT_NAME[d], 28)}${n}${n === 0 ? '!' : ''}`);
    need(n >= 1, `Cuentas: ${DEPT_NAME[d]} no tiene admin de departamento`);
  }
}

// ───────────────────────────── 2. Estudiantes ─────────────────────────────
{
  const st = q('student_db', 'SELECT user_id, program_id, program, profile_completeness FROM student_profiles');
  const sinPrograma = st.filter((s) => !deptOfId[s[1]]);
  out('\n■ Estudiantes');
  out(`  ${pad('', 24)}${DEPTS.map((d) => pad(DEPT_NAME[d], 13)).join('')}`);
  const per = Object.fromEntries(DEPTS.map((d) => [d, st.filter((s) => s[1] === idOf[d])]));
  out(`  ${pad('total', 24)}${DEPTS.map((d) => pad(per[d].length, 13)).join('')}`);
  const userApps = {};
  const a2 = q('application_db', 'SELECT student_id, status FROM applications');
  for (const [sid, status] of a2) (userApps[sid] ||= []).push(status);
  const stat = (label, f) => out(`  ${pad(label, 24)}${DEPTS.map((d) => pad(per[d].filter(f).length, 13)).join('')}`);
  stat('sin postular', (s) => !(userApps[s[0]] || []).length);
  stat('proyecto activo', (s) => (userApps[s[0]] || []).includes('in_progress'));
  stat('proyecto completado', (s) => (userApps[s[0]] || []).includes('completed'));
  stat('perfil incompleto', (s) => Number(s[3]) < 100);
  out(`  sin programa válido: ${sinPrograma.length}`);
  need(sinPrograma.length === 0, `Estudiantes: ${sinPrograma.length} sin programa válido (Sistemas/Electrónica/Civil)`);
  for (const d of DEPTS) {
    need(per[d].length >= 8, `Estudiantes: ${DEPT_NAME[d]} tiene ${per[d].length} (mínimo 8)`);
    need(per[d].some((s) => (userApps[s[0]] || []).includes('in_progress')), `Estudiantes: ${DEPT_NAME[d]} sin estudiante con proyecto activo`);
    need(per[d].some((s) => (userApps[s[0]] || []).includes('completed')), `Estudiantes: ${DEPT_NAME[d]} sin estudiante con proyecto completado`);
    need(per[d].some((s) => !(userApps[s[0]] || []).length), `Estudiantes: ${DEPT_NAME[d]} sin estudiante sin postular`);
  }
  // balance: la diferencia entre el mayor y el menor no debe pasar de ~30 %
  const sizes = DEPTS.map((d) => per[d].length);
  const spread = (Math.max(...sizes) - Math.min(...sizes)) / Math.max(...sizes);
  out(`  desbalance máx/mín: ${(spread * 100).toFixed(0)} %`);
  need(spread <= 0.3, `Estudiantes: desbalance entre departamentos ${(spread * 100).toFixed(0)} % (máx. 30 %)`);
  // onboarding incompleto (cuenta de estudiante)
  const inc = q('user_db', "SELECT count(*) FROM user_profiles WHERE role='student' AND is_onboarding_complete = false")[0][0];
  need(Number(inc) > 0, 'Estudiantes: falta al menos un estudiante con onboarding incompleto');
  out(`  onboarding incompleto: ${inc}`);
}

// ───────────────────────────── 3. Empresas ─────────────────────────────
{
  const co = q('company_db', "SELECT verification_status, array_to_string(program_ids, ',') FROM companies");
  const states = ['verified', 'pending', 'rejected', 'suspended'];
  const t = {};
  const multi = [];
  for (const [status, ids] of co) {
    const ds = ids ? ids.split(',').map((i) => deptOfId[i]).filter(Boolean) : [];
    if (!ds.length) ((t[status] ||= {}).NONE = (t[status].NONE || 0) + 1);
    for (const d of ds) ((t[status] ||= {})[d] = (t[status][d] || 0) + 1);
    if (ds.length > 1) multi.push(status);
  }
  matrix('Empresas (una empresa en 2 departamentos cuenta en ambos)', states, t, { required: ['verified', 'pending'], requiredGlobal: ['rejected', 'suspended'] });
  out(`  empresas en 2+ departamentos: ${multi.length}`);
  need(multi.length >= 2, 'Empresas: se requieren al menos 2 empresas en dos departamentos');
  for (const d of DEPTS) {
    const n = co.filter(([, ids]) => (ids || '').includes(idOf[d])).length;
    need(n >= 3, `Empresas: ${DEPT_NAME[d]} tiene ${n} (mínimo 3)`);
  }
  const sinProg = co.filter(([, ids]) => !ids).length;
  need(sinProg === 0, `Empresas: ${sinProg} sin departamento`);
}

// ───────────────────────────── 4. Proyectos ─────────────────────────────
{
  const pr = q('project_db', 'SELECT status, academic_programs FROM projects');
  const states = ['draft', 'pending_approval', 'needs_changes', 'published', 'in_progress', 'completed', 'cancelled'];
  const t = {};
  let multi = 0;
  for (const [status, progs] of pr) {
    const ds = DEPTS.filter((d) => (progs || '').split(',').includes(idOf[d]));
    if (!ds.length) ((t[status] ||= {}).NONE = (t[status].NONE || 0) + 1);
    for (const d of ds) ((t[status] ||= {})[d] = (t[status][d] || 0) + 1);
    if (ds.length > 1) multi++;
  }
  matrix('Proyectos (multi-departamento cuenta en cada uno)', states, t, { required: states });
  out(`  proyectos multi-departamento: ${multi}`);
  need(multi >= 1, 'Proyectos: falta al menos un proyecto multi-departamento');
  const bare = q('project_db', "SELECT count(*) FROM projects p WHERE NOT EXISTS (SELECT 1 FROM project_skills s WHERE s.project_id = p.id)")[0][0];
  out(`  proyectos sin skills (fixture del e2e de matching): ${bare}`);
  need(Number(bare) >= 1, 'Proyectos: el fixture "proyecto sin skills" del e2e de matching debe existir (≥ 1 proyecto sin skills)');
}

// ───────────────────────────── 5. Postulaciones ─────────────────────────────
{
  const states = ['pending', 'under_review', 'shortlisted', 'interview', 'accepted', 'pending_supervisor', 'in_progress', 'completed', 'rejected', 'withdrawn', 'cancelled'];
  matrix('Postulaciones (11 estados)', states, tally(apps, 1, 2), { required: states });
  const iv = q('application_db', 'SELECT interview_type, status FROM interviews');
  const types = ['phone', 'video', 'in_person', 'technical'];
  const ist = ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'];
  const have = new Set(iv.map(([ty, st]) => `${ty}:${st}`));
  const missing = [];
  for (const ty of types) for (const st of ist) if (!have.has(`${ty}:${st}`)) missing.push(`${ty}/${st}`);
  out(`\n■ Entrevistas: ${iv.length} (${types.length * ist.length - missing.length}/${types.length * ist.length} combinaciones tipo×estado)`);
  warnings.push(...(missing.length ? [`Entrevistas: faltan combinaciones tipo/estado: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`] : []));
  const res = q('application_db', "SELECT DISTINCT company_resolution FROM interviews WHERE company_resolution IS NOT NULL").map((r) => r[0]);
  need(res.includes('passed') && res.includes('failed'), 'Entrevistas: faltan resoluciones passed y failed');
  const sd = q('application_db', 'SELECT status FROM selection_document_requests').map((r) => r[0]);
  for (const s of ['requested', 'submitted', 'approved', 'rejected']) need(sd.includes(s), `Documentos de selección: falta "${s}"`);
  out(`■ Documentos de selección: ${[...new Set(sd)].join(', ') || '—'}`);
}

// ───────────────────────────── 6. Asignaciones y flujo académico ─────────────────────────────
{
  const a = q('admin_db', 'SELECT status, role, program_id FROM supervisor_assignments');
  const states = ['pending_acceptance', 'accepted', 'active', 'declined', 'disconnected', 'replaced', 'completed'];
  matrix('Asignaciones de docente (7 estados)', states, tally(a, 0, 2), { required: ['pending_acceptance', 'accepted', 'completed'], requiredGlobal: ['declined', 'disconnected', 'replaced'] });
  // `active` es un valor heredado del enum: ningún flujo lo produce (aceptar deja `accepted`) y las vistas del docente solo muestran `accepted`.
  if (!a.some((x) => x[0] === 'active')) out('  (el estado heredado `active` no se siembra a propósito: el sistema nunca lo produce)');
  else warnings.push('Asignaciones: hay filas en estado heredado `active`, que el sistema no produce y el docente no ve');
  const roles = ['asesor', 'jurado_anteproyecto', 'jurado_final'];
  for (const r of roles) need(a.some((x) => x[1] === r), `Asignaciones: falta el rol ${r}`);

  const sub = q('application_db', 'SELECT status, application_id FROM academic_submissions');
  const subStates = ['pending_submission', 'submitted', 'under_review', 'needs_revision', 'revised', 'approved', 'rejected', 'expired'];
  matrix('Anteproyectos (8 estados)', subStates, tallyApp(sub, 0, 1), { requiredGlobal: subStates });

  const rec = q('application_db', 'SELECT status, application_id FROM project_academic_records');
  const recStates = ['waiting_anteproyecto', 'waiting_documents', 'active', 'waiting_final_docs', 'final_docs_review', 'finalizing', 'completed', 'cancelled'];
  matrix('Registro académico', recStates, tallyApp(rec, 0, 1), { required: ['waiting_anteproyecto', 'active', 'completed'], requiredGlobal: recStates });

  const docs = q('application_db', 'SELECT stage, status FROM project_documents');
  for (const stage of ['initial', 'final']) for (const s of ['pending', 'submitted', 'approved', 'rejected']) {
    if (!docs.some((d) => d[0] === stage && d[1] === s)) warnings.push(`Documentos ${stage}: falta el estado "${s}"`);
  }
  const del = q('application_db', 'SELECT status FROM student_deliverables').map((r) => r[0]);
  for (const s of ['pending', 'submitted', 'approved', 'rejected', 'needs_revision']) need(del.includes(s), `Entregables: falta "${s}"`);
  out(`■ Entregables: ${[...new Set(del)].join(', ')}`);
}

// ───────────────────────────── 7. Evaluaciones ─────────────────────────────
{
  const ev = q('evaluation_db', 'SELECT evaluation_type, status, overall_score, application_id, is_anonymous FROM evaluations');
  const types = ['company_evaluates_student', 'student_evaluates_company', 'supervisor_evaluates_student', 'student_evaluates_supervisor', 'self_evaluation'];
  const states = ['pending', 'in_progress', 'completed', 'expired'];
  out('\n■ Evaluaciones (tipo × estado)');
  out(`  ${pad('tipo', 32)}${states.map((s) => pad(s, 13)).join('')}`);
  for (const ty of types) {
    out(`  ${pad(ty, 32)}${states.map((s) => pad(ev.filter((e) => e[0] === ty && e[1] === s).length, 13)).join('')}`);
  }
  for (const s of states) need(ev.some((e) => e[1] === s), `Evaluaciones: falta el estado "${s}"`);
  const per = {};
  for (const e of ev) { const d = appDept[e[3]] || 'NONE'; (per[d] ||= { pending: 0, completed: 0 }); if (e[1] === 'pending') per[d].pending++; if (e[1] === 'completed') per[d].completed++; }
  for (const d of DEPTS) {
    need((per[d]?.completed || 0) > 0, `Evaluaciones: ${DEPT_NAME[d]} sin evaluaciones completadas`);
    need((per[d]?.pending || 0) > 0, `Evaluaciones: ${DEPT_NAME[d]} sin evaluaciones pendientes`);
  }
  const bad = ev.filter((e) => e[1] === 'completed' && Number(e[2]) > 0 && Number(e[2]) <= 5);
  need(bad.length === 0, `Evaluaciones: ${bad.length} con puntaje en escala 0–5 (debe ser 0–100)`);
  need(ev.some((e) => e[4] === 't'), 'Evaluaciones: falta al menos una evaluación anónima');
  const named = q('evaluation_db', "SELECT count(*) FROM evaluation_ratings")[0][0];
  out(`  calificaciones por criterio: ${named}`);
}

// ───────────────────────────── 8. Docentes ─────────────────────────────
{
  const sup = q('admin_db', 'SELECT program_id, is_active, role, employee_code, user_id FROM supervisors');
  out('\n■ Docentes');
  out(`  ${pad('', 24)}${DEPTS.map((d) => pad(DEPT_NAME[d], 13)).join('')}`);
  const per = Object.fromEntries(DEPTS.map((d) => [d, sup.filter((s) => s[0] === idOf[d])]));
  out(`  ${pad('total', 24)}${DEPTS.map((d) => pad(per[d].length, 13)).join('')}`);
  out(`  ${pad('activos', 24)}${DEPTS.map((d) => pad(per[d].filter((s) => s[1] === 't').length, 13)).join('')}`);
  out(`  ${pad('roles distintos', 24)}${DEPTS.map((d) => pad(new Set(per[d].map((s) => s[2])).size, 13)).join('')}`);
  for (const d of DEPTS) {
    need(per[d].length >= 4, `Docentes: ${DEPT_NAME[d]} tiene ${per[d].length} (mínimo 4)`);
    need(new Set(per[d].map((s) => s[2])).size >= 2, `Docentes: ${DEPT_NAME[d]} con un solo rol`);
  }
  need(sup.some((s) => s[1] === 'f'), 'Docentes: falta al menos un docente inactivo');
  const sinProg = sup.filter((s) => !deptOfId[s[0]]).length;
  out(`  sin departamento: ${sinProg}`);
  need(sinProg === 0, `Docentes: ${sinProg} sin departamento`);
  // docente de otro departamento actuando como jurado (D8)
  const asg = q('admin_db', 'SELECT a.program_id, s.program_id FROM supervisor_assignments a JOIN supervisors s ON s.id = a.supervisor_id');
  const cross = asg.filter(([ap, sp]) => ap && sp && ap !== sp).length;
  out(`  asignaciones con docente de otro departamento: ${cross}`);
  need(cross >= 1, 'Docentes: falta un docente de otro departamento actuando en una asignación (D8)');
  // cupo lleno: un docente con tantas asignaciones aceptadas como su máximo (si existe la columna)
  try {
    const cap = q('admin_db', "SELECT count(*) FROM supervisors s WHERE max_students IS NOT NULL AND (SELECT count(*) FROM supervisor_assignments a WHERE a.supervisor_id = s.id AND a.role='asesor' AND a.status IN ('accepted','active','pending_acceptance')) >= max_students")[0][0];
    need(Number(cap) > 0, 'Docentes: falta un docente con cupo lleno');
    out(`  con cupo lleno: ${cap}`);
  } catch { warnings.push('Docentes: no se pudo comprobar el cupo lleno (columna max_students)'); }
}

// ───────────────────────────── 9. Notificaciones y chat ─────────────────────────────
{
  const n = q('notification_db', 'SELECT type, is_read FROM notifications');
  const types = [...new Set(n.map((x) => x[0]))];
  out(`\n■ Notificaciones: ${n.length} (leídas ${n.filter((x) => x[1] === 't').length} / sin leer ${n.filter((x) => x[1] === 'f').length}) · ${types.length} tipos`);
  need(n.length >= 60, `Notificaciones: ${n.length} (mínimo 60)`);
  need(n.some((x) => x[1] === 't') && n.some((x) => x[1] === 'f'), 'Notificaciones: faltan leídas o sin leer');
  need(types.length >= 6, `Notificaciones: solo ${types.length} tipos distintos (mínimo 6)`);
  const c = q('chat_db', 'SELECT type, count(*) FROM conversations GROUP BY 1');
  const ctypes = c.map((x) => x[0]);
  const m = q('chat_db', 'SELECT count(*) FROM messages')[0][0];
  out(`■ Chat: ${c.map((x) => `${x[0]}=${x[1]}`).join(', ') || '—'} · mensajes ${m}`);
  need(['direct', 'group', 'project'].every((t) => ctypes.includes(t)), 'Chat: faltan conversaciones directa, grupo o proyecto');
  need(Number(m) >= 40, `Chat: ${m} mensajes (mínimo 40)`);
}

// ───────────────────────────── Resumen ─────────────────────────────
if (!QUIET) console.log(lines.join('\n'));
console.log('\n══════════ RESULTADO ══════════');
if (warnings.length) { console.log(`Avisos (${warnings.length}):`); warnings.forEach((w) => console.log(`  · ${w}`)); }
if (failures.length) {
  console.log(`\nFALTAN ${failures.length} requisitos de cobertura:`);
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}
console.log('Cobertura completa ✔');
