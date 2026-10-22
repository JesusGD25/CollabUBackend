#!/usr/bin/env node
/**
 * SEED "SHOWCASE" — cohorte completa y creíble para demos/sustentación.
 *
 * Genera Backend/scripts/seed_showcase.sql (ADITIVO e IDEMPOTENTE) con:
 *   · 4 empresas verificadas con perfil completo (sedes, contactos, áreas)
 *   · 20 estudiantes con perfil 100 % completo (skills, experiencia, idiomas, CV…)
 *   · 24 proyectos en todos los estados, con skills del catálogo real y entregables
 *   · ~44 postulaciones con su historial (timeline), entrevistas y pruebas técnicas
 *   · 13 hilos académicos (7 completados + 6 en curso) con asesor, jurados,
 *     anteproyecto, documentos, entregables, comentarios y acuerdos
 *   · 28 evaluaciones bidireccionales con calificaciones por criterio
 *   · los archivos físicos (PDF) de todo lo anterior, descargables
 *
 * NO toca ninguna fila del seed base (28 cuentas, 19 proyectos…): usa IDs propios
 * y determinísticos (sha1 de una clave) con ON CONFLICT DO NOTHING, de modo que
 * volver a ejecutarlo no duplica nada.
 *
 * Requisitos: contenedor Postgres corriendo y seed base cargado (de ahí lee los
 * catálogos reales —skills, programas, asesores, periodos— que admin-service
 * genera en runtime con UUIDs no deterministas).
 *
 * Uso:
 *   node generate-seed-showcase.mjs [--today YYYY-MM-DD] [--public-url http://host:3000]
 *        [--out <sql>] [--upload-dir <dir>] [--storage-prefix /app/uploads]
 *        [--container collab-u-postgres]
 *
 *   --today          Fecha "de hoy" del escenario (default: hoy). Define cierres de
 *                    convocatorias y entrevistas futuras; el historial usa fechas fijas.
 *   --public-url     URL pública del api-gateway: se usa en cv_url / file_url para que
 *                    los links del CV y de los entregables abran la descarga real.
 *   --upload-dir     Carpeta del host donde se escriben los PDF (default: carpeta de
 *                    uploads de storage-service).
 *   --storage-prefix Carpeta que se guarda en files.storage_path (con Docker:
 *                    /app/uploads; ver Run-Seed-Showcase.ps1).
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPdf } from './lib/seed-file-builders.mjs';
import { companies as baseCompanies } from './showcase/data-companies.mjs';
import { students as baseStudents } from './showcase/data-students.mjs';
import { projects as baseProjects, looseApplications as baseLoose, threads as baseThreads } from './showcase/data-projects.mjs';
import { deptCompanies } from './showcase/data-dept-companies.mjs';
import { deptStudents } from './showcase/data-dept-students.mjs';
import { deptProjects } from './showcase/data-dept-projects.mjs';
import { deptStaff, deptLoose, deptThreads } from './showcase/data-dept-flows.mjs';
import { emitExtras } from './showcase/extras.mjs';

// Capa base del showcase + capa "departamentos" (equilibrio Sistemas/Electrónica/Civil, todos los estados).
const companies = [...baseCompanies, ...deptCompanies];
const students = [...baseStudents, ...deptStudents];
const projects = [...baseProjects, ...deptProjects];
const looseApplications = [...baseLoose, ...deptLoose];
const threads = [...baseThreads, ...deptThreads];

// ───────────────────────────── CLI ─────────────────────────────
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const CONTAINER = arg('--container', process.env.POSTGRES_CONTAINER || 'collab-u-postgres');
const PGUSER = process.env.POSTGRES_USER || 'collabu_admin';
const OUT = arg('--out', path.join(scriptDir, 'seed_showcase.sql'));
const PUBLIC_URL = arg('--public-url', 'http://localhost:3000').replace(/\/+$/, '');
const UPLOAD_DIR = arg('--upload-dir', process.env.UPLOAD_DIR || path.join(scriptDir, '..', 'services', 'storage-service', 'uploads'));
const STORAGE_PREFIX = arg('--storage-prefix', process.env.SEED_STORAGE_PREFIX || null);
const localToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
const TODAY_STR = arg('--today', localToday());

// ───────────────────────────── Utilidades ─────────────────────────────
const uid = (key) => {
  const h = createHash('sha1').update(`collabu-showcase:${key}`).digest('hex');
  // Formato UUID v4 (versión 4, variante a): varios DTO validan con @IsUUID('4')
  // (p. ej. chat-service) y rechazarían ids con versión 5.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// Colombia = UTC-5 todo el año (sin horario de verano).
const col = (s) => {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) throw new Error(`Fecha inválida: ${s}`);
  const [, y, mo, d, h = '09', mi = '00', se = '00'] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h + 5, +mi, +se));
};
const p2 = (n) => String(n).padStart(2, '0');
const local = (date) => new Date(date.getTime() - 5 * 3600e3);
const ymd = (date) => { const l = local(date); return `${l.getUTCFullYear()}-${p2(l.getUTCMonth() + 1)}-${p2(l.getUTCDate())}`; };
const fmtTs = (date) => { const l = local(date); return `${ymd(date)} ${p2(l.getUTCHours())}:${p2(l.getUTCMinutes())}:${p2(l.getUTCSeconds())}-05`; };
const addDays = (date, n) => new Date(date.getTime() + n * 864e5);
const atTime = (date, hhmm) => col(`${ymd(date)} ${hhmm}`);
const minDate = (...ds) => new Date(Math.min(...ds.map((d) => d.getTime())));

class Raw { constructor(s) { this.s = s; } }
const T = (date) => new Raw(`'${fmtTs(date)}'`);       // timestamptz
const D = (date) => new Raw(`'${ymd(date)}'`);         // date
const J = (obj) => new Raw(`'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`);
const A = (arr) => (arr && arr.length ? new Raw(`ARRAY[${arr.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(', ')}]::text[]`) : null);

function val(v) {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Raw) return v.s;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
}

const TODAY = col(`${TODAY_STR} 09:00`);

// Acumulador de filas por (base de datos, tabla). Las tablas se emiten en el orden en
// que aparecen por primera vez (padres antes que hijas por cómo se llama `ins`), y las
// bases en DB_ORDER. Agrupar por tabla evita un INSERT por fila.
const DB_ORDER = ['auth_db', 'user_db', 'student_db', 'company_db', 'storage_db', 'project_db', 'admin_db', 'application_db', 'evaluation_db', 'notification_db', 'chat_db'];
const buffers = Object.fromEntries(DB_ORDER.map((d) => [d, new Map()]));
const raw = Object.fromEntries(DB_ORDER.map((d) => [d, []])); // SQL directo por base (UPDATE y filas con columnas distintas)
const USERS_COLS = ['id', 'email', 'password_hash', 'role', 'is_verified', 'is_active', 'terms_accepted', 'terms_accepted_at', 'terms_version', 'data_treatment_accepted', 'failed_login_attempts', 'locked_until', 'last_login', 'created_at', 'updated_at'];
const USER_PROFILE_COLS = ['id', 'user_id', 'role', 'first_name', 'last_name', 'country', 'city', 'department', 'bio', 'date_of_birth', 'gender', 'website_url', 'profile_completeness', 'is_onboarding_complete', 'last_active_at', 'created_at', 'updated_at'];
function ins(db, table, cols, rows) {
  if (!rows.length) return;
  const m = buffers[db];
  if (!m.has(table)) m.set(table, { cols, rows: [] });
  const entry = m.get(table);
  if (entry.cols.join(',') !== cols.join(',')) throw new Error(`Columnas inconsistentes para ${db}.${table}`);
  for (const r of rows) {
    if (r.length !== cols.length) throw new Error(`Fila con ${r.length} valores para ${cols.length} columnas en ${db}.${table}: ${JSON.stringify(r).slice(0, 160)}`);
    entry.rows.push(r);
  }
}
// `files` se actualiza al re-ejecutar: así correr el seed en otro entorno (otra ruta de
// uploads, p. ej. /app/uploads en Docker) corrige storage_path en vez de dejar la vieja.
const CONFLICT = {
  files: 'ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, storage_path = EXCLUDED.storage_path, file_size_bytes = EXCLUDED.file_size_bytes, updated_at = EXCLUDED.updated_at',
};
function flush(db) {
  const out = [];
  for (const [table, { cols, rows }] of buffers[db]) {
    for (let i = 0; i < rows.length; i += 40) {
      const chunk = rows.slice(i, i + 40);
      out.push(
        `INSERT INTO "${table}" (${cols.join(', ')}) VALUES\n` +
          chunk.map((r) => `(${r.map(val).join(', ')})`).join(',\n') +
          `\n${CONFLICT[table] || 'ON CONFLICT DO NOTHING'};`,
      );
    }
  }
  out.push(...raw[db]);
  return out;
}

function psql(db, query) {
  const args = ['exec', '-i', CONTAINER, 'psql', '-U', PGUSER, '-d', db, '-t', '-A', '-F', '|', '-c', query];
  let out;
  try {
    out = execFileSync('docker', args, { encoding: 'utf-8' });
  } catch (e) {
    throw new Error(`No se pudo consultar ${db} (¿contenedor ${CONTAINER} corriendo?): ${e.message}`);
  }
  return out.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean).map((l) => l.split('|'));
}

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);

// ───────────────────────────── Catálogos reales (desde la BD) ─────────────────────────────
console.log(`Showcase · hoy=${TODAY_STR} · contenedor=${CONTAINER} · public-url=${PUBLIC_URL}`);

const catalog = new Map(); // nombre normalizado -> {id, display, category}
for (const [id, name, display, category] of psql('admin_db', 'SELECT id, name, display_name, category FROM skill_catalog')) {
  catalog.set(name, { id, display, category });
}
if (catalog.size < 20) throw new Error('skill_catalog casi vacío: ¿admin-service arrancó al menos una vez?');

const programs = {}; // SIS/ELE/CIV -> {id, name}
const progCodes = { SIS: 'ING-SIS', ELE: 'ING-ELE', CIV: 'ING-CIV' };
{
  const rows = psql('admin_db', 'SELECT code, id, name FROM academic_programs');
  for (const [k, code] of Object.entries(progCodes)) {
    const r = rows.find((x) => x[0] === code);
    if (!r) throw new Error(`Programa ${code} no encontrado en academic_programs`);
    programs[k] = { id: r[1], name: r[2] };
  }
}

const supervisors = {}; // DOC-00x -> {id, userId}
for (const [code, id, userId] of psql('admin_db', 'SELECT employee_code, id, user_id FROM supervisors')) supervisors[code] = { id, userId };
for (const code of ['DOC-001', 'DOC-002', 'DOC-003', 'DOC-004']) {
  if (!supervisors[code]) throw new Error(`Falta el supervisor ${code}: carga primero el seed base (Run-Seed.ps1).`);
}
// Docentes de la capa "departamentos": ids deterministas (sus filas las emite showcase/extras.mjs).
for (const d of deptStaff) supervisors[d.code] = { id: uid(`sup:${d.code}`), userId: uid(`sup-user:${d.code}`) };

const periodIds = {};
for (const [name, id] of psql('admin_db', 'SELECT name, id FROM academic_periods')) periodIds[name] = id;
for (const name of ['2026-1', '2026-2']) {
  if (!periodIds[name]) throw new Error(`Falta el periodo ${name}: carga primero el seed base (Run-Seed.ps1).`);
}
if (!periodIds['2025-2']) periodIds['2025-2'] = uid('period:2025-2');

const adminRow = psql('auth_db', "SELECT id, password_hash FROM users WHERE email = 'admin01@collabu.dev'")[0];
if (!adminRow) throw new Error('No existe admin01@collabu.dev: carga primero el seed base (Run-Seed.ps1).');
const [ADMIN_ID, PASSWORD_HASH] = adminRow;

const docReqs = psql('admin_db', 'SELECT id, name, actor_type, required_at_stage FROM document_requirements ORDER BY display_order').map(([id, name, actor, stage]) => ({ id, name, actor, stage }));
const reqCarta = docReqs.find((r) => r.actor === 'company' && r.stage === 'pre_initiation');
const reqPoliza = docReqs.find((r) => r.actor === 'student' && r.stage === 'pre_initiation');
const reqCert = docReqs.find((r) => r.actor === 'student' && r.stage === 'post_initiation');

const criteria = {}; // tipo -> [{id,name}]
try {
  for (const [id, type, name] of psql('evaluation_db', 'SELECT id, evaluation_type, name FROM evaluation_criteria ORDER BY evaluation_type, display_order')) {
    (criteria[type] ||= []).push({ id, name });
  }
} catch { /* sin criterios: se omiten las calificaciones por criterio */ }
console.log(`Catálogo: ${catalog.size} skills · criterios de evaluación: ${Object.keys(criteria).length} tipos · documentos requeridos: ${docReqs.length}`);

const skillRef = (name) => {
  const c = catalog.get(name);
  if (!c) throw new Error(`Skill "${name}" no existe en skill_catalog`);
  return c;
};

// ───────────────────────────── Archivos (PDF) ─────────────────────────────
const fileRows = []; // filas para storage_db.files
const physical = []; // {storedName, buffer}
const fileUrl = (id) => `${PUBLIC_URL}/api/v1/storage/files/${id}/download`;
function addFile({ key, owner, name, category, entityType, entityId, lines, at }) {
  const id = uid(`file:${key}`);
  const storedName = `sc-${id.slice(0, 8)}-${slugify(name).slice(0, 40)}.pdf`;
  const buffer = buildPdf(name.replace(/\.pdf$/i, ''), lines);
  physical.push({ storedName, buffer });
  const dir = (STORAGE_PREFIX || UPLOAD_DIR).replace(/[\\/]+$/, '');
  fileRows.push([id, owner, name, storedName, 'application/pdf', buffer.length, category, entityType, entityId, `${dir}/${storedName}`, 'active', false, T(at), T(at)]);
  return id;
}

// ───────────────────────────── Estructuras de apoyo ─────────────────────────────
const C = Object.fromEntries(companies.map((c) => [c.key, { ...c, userId: uid(`co-user:${c.key}`), companyId: uid(`co:${c.key}`) }]));
const S = Object.fromEntries(students.map((s, i) => [s.key, { ...s, idx: i + 1, userId: uid(`st-user:${s.key}`), profileId: uid(`st:${s.key}`), fullName: `${s.first} ${s.last}` }]));
const P = Object.fromEntries(projects.map((p) => [p.key, { ...p, id: uid(`proj:${p.key}`), company: C[p.co] }]));
const threadOf = Object.fromEntries(threads.map((t) => [t.project, t]));

const dayOffset = (days, time = '09:00') => atTime(addDays(TODAY, days), time);
const firstName = (s) => s.first.split(' ')[0];

// ═════════════════════════════ 1. EMPRESAS ═════════════════════════════
for (const [ci, c] of Object.values(C).entries()) {
  const created = col(c.createdAt);
  const lastLogin = dayOffset(-(1 + ci), '08:30');
  ins('auth_db', 'users', USERS_COLS,
    [[c.userId, c.email, PASSWORD_HASH, 'company', true, true, true, T(created), 'v1.0', true, 0, null, T(lastLogin), T(created), T(created)]]);
  ins('user_db', 'user_profiles', USER_PROFILE_COLS,
    [[uid(`co-uprof:${c.key}`), c.userId, 'company', c.contact.first, c.contact.last, 'Colombia', c.city, c.state, c.description.split('\n')[0], null, null, c.website, 100, true, T(lastLogin), T(created), T(created)]]);
  c.rating = 0; c.reviews = 0; // se actualizan tras construir las evaluaciones
  c.status = c.status || 'verified';
  c.programKeys = c.programs || { C1: ['SIS'], C2: ['SIS', 'ELE'], C3: ['CIV'], C4: ['ELE'] }[c.key] || [];
}
// (las filas de company_db.companies se emiten después, con rating y proyectos ya calculados)

// ═════════════════════════════ 2. ESTUDIANTES ═════════════════════════════
const studentRatings = {}; // key -> [scores]
for (const s of Object.values(S)) studentRatings[s.key] = [];

// ═════════════════════════════ 3. PROYECTOS ═════════════════════════════
const dateFor = {}; // proyecto -> {start, end, deadline}
for (const p of Object.values(P)) {
  let start = null, end = null, deadline = null;
  if (p.status === 'published') {
    deadline = dayOffset(p.deadlineAhead);
    start = addDays(deadline, 14);
    end = addDays(start, p.months * 30);
  } else if (p.start) {
    start = col(p.start);
    end = addDays(start, p.weeks * 7 - 3);
    deadline = addDays(start, -21);
  } else if (p.status === 'pending_approval') {
    deadline = dayOffset(40);
  } else if (p.status === 'needs_changes') {
    deadline = dayOffset(35);
  } else if (p.status === 'cancelled') {
    deadline = col('2026-06-01');
  }
  dateFor[p.key] = { start, end, deadline };
}

// ═════════════════════════════ 4. POSTULACIONES + HILOS ═════════════════════════════
const apps = []; // todas las aplicaciones normalizadas
const timelineRows = [];
const interviewRows = [];
const selDocRows = [];
const ivPatches = []; // UPDATE de columnas de entrevistas que el INSERT masivo no cubre

const companyUser = (pk) => P[pk].company.userId;
function tl(app, from, to, at, by, comment) {
  timelineRows.push([uid(`tl:${app.id}:${to}`), app.id, from, to, comment, by, T(at), null].slice(0, 7));
}

// 4a. Aplicaciones sueltas
for (const [pk, sk, status, applied, letter, extra = {}] of looseApplications) {
  const proj = P[pk], stu = S[sk];
  const at0 = col(applied);
  const app = { id: uid(`app:${pk}:${sk}`), pk, sk, status, applied: at0, letter, loose: true, extra };
  const co = companyUser(pk);
  app.reviewedAt = null; app.reviewedBy = null; app.updatedAt = at0;
  const step = (from, to, days, time, by, comment) => { const at = atTime(addDays(at0, days), time); tl(app, from, to, at, by, comment); app.updatedAt = at; return at; };
  if (status === 'under_review') { app.reviewedAt = step('pending', 'under_review', 1, '09:30', co, 'Postulación en revisión por el equipo de talento.'); app.reviewedBy = co; }
  if (status === 'shortlisted') { app.reviewedAt = step('pending', 'under_review', 1, '09:30', co, 'Postulación en revisión por el equipo de talento.'); app.reviewedBy = co; step('under_review', 'shortlisted', 3, '15:10', co, 'Preseleccionado/a para la siguiente etapa del proceso.'); }
  if (status === 'interview') { app.reviewedAt = step('pending', 'under_review', 1, '09:30', co, 'Postulación en revisión por el equipo de talento.'); app.reviewedBy = co; step('under_review', 'shortlisted', 3, '15:10', co, 'Preseleccionado/a para la siguiente etapa del proceso.'); step('shortlisted', 'interview', 4, '11:00', co, 'Entrevista programada con el equipo técnico.'); }
  if (status === 'rejected') {
    if (extra.quick) { app.reviewedAt = step('pending', 'rejected', 2, '10:20', co, extra.reason); }
    else { app.reviewedAt = step('pending', 'under_review', 1, '09:30', co, 'Postulación en revisión por el equipo de talento.'); step('under_review', 'rejected', 4, '16:00', co, extra.reason); }
    app.reviewedBy = co; app.rejectionReason = extra.reason;
  }
  if (status === 'withdrawn') { step('pending', 'withdrawn', 2, '12:15', stu.userId, extra.reason); app.withdrawalReason = extra.reason; }
  // Estados avanzados del embudo (sin hilo académico todavía): aceptada, pendiente de asesor y cancelada.
  if (['accepted', 'pending_supervisor'].includes(status)) {
    app.reviewedAt = step('pending', 'under_review', 1, '09:30', co, 'Postulación en revisión por el equipo de talento.'); app.reviewedBy = co;
    step('under_review', 'shortlisted', 3, '15:10', co, 'Preseleccionado/a para la siguiente etapa del proceso.');
    step('shortlisted', 'interview', 4, '11:00', co, 'Entrevista programada con el equipo técnico.');
    app.acceptedAt = step('interview', 'accepted', 9, '11:30', co, 'Entrevista superada; se acepta la postulación.');
    if (status === 'pending_supervisor') step('accepted', 'pending_supervisor', 10, '09:30', ADMIN_ID, 'Asesor académico asignado; pendiente de aceptación.');
  }
  if (status === 'cancelled') {
    app.reviewedAt = step('pending', 'under_review', 1, '09:30', co, 'Postulación en revisión por el equipo de talento.'); app.reviewedBy = co;
    step('under_review', 'cancelled', 20, '10:00', co, extra.reason);
  }
  if (['shortlisted', 'interview', 'accepted', 'pending_supervisor'].includes(status)) app.notes = 'Buen perfil técnico y de comunicación; confirmar disponibilidad horaria antes de la entrevista.';
  if (status === 'under_review') app.notes = 'Perfil con skills alineadas; pendiente comparar con el resto de candidatos.';
  apps.push(app);
  if (extra.asesorFlow) app.asesorFlow = extra.asesorFlow;

  if (extra.interview) {
    // iv.status: scheduled (por defecto) | completed | cancelled | rescheduled | no_show. `daysAgo` fecha entrevistas pasadas.
    const iv = extra.interview;
    const ivStatus = iv.status || 'scheduled';
    const when = atTime(addDays(TODAY, iv.daysAhead !== undefined ? iv.daysAhead : -iv.daysAgo), iv.time.slice(0, 5));
    const done = ivStatus === 'completed';
    interviewRows.push([uid(`iv:${app.id}`), app.id, T(when), 45, iv.type, iv.location || null, iv.link || null, ivStatus, co, done ? (iv.feedback || null) : null, null, done ? (iv.score ?? null) : null, null, null, false, T(app.updatedAt), T(app.updatedAt)]);
    // `cancelled_reason` y la resolución de la empresa viven en columnas propias: se completan con un UPDATE posterior.
    if (iv.cancelledReason) ivPatches.push(`UPDATE interviews SET cancelled_reason = ${val(iv.cancelledReason)} WHERE id = ${val(uid(`iv:${app.id}`))};`);
    if (iv.resolution) ivPatches.push(`UPDATE interviews SET company_resolution = '${iv.resolution}', resolution_comment = ${val(iv.resolution === 'passed' ? 'Avanza a la siguiente etapa del proceso.' : 'No continúa en el proceso de selección.')} WHERE id = ${val(uid(`iv:${app.id}`))};`);
  }
  if (extra.selectionDoc) {
    // Prueba técnica de selección en estado requested | submitted | approved | rejected.
    const sd = extra.selectionDoc;
    const at = atTime(addDays(at0, 5), '10:00');
    let fid = null, submittedAt = null, reviewedAt = null, reviewer = null;
    if (['submitted', 'approved', 'rejected'].includes(sd.status)) {
      submittedAt = atTime(addDays(at0, 7), '19:00');
      fid = addFile({ key: `sel:${app.id}`, owner: stu.userId, name: 'solucion-prueba-tecnica.pdf', category: 'interview_attachment', entityType: 'selection_document_request', entityId: uid(`sel:${app.id}`), at: submittedAt,
        lines: [`Estudiante: ${stu.fullName}`, `Proyecto: ${proj.title}`, `Prueba: ${sd.name}`, 'Solución entregada en documento adjunto con el desarrollo y las justificaciones.'] });
    }
    if (['approved', 'rejected'].includes(sd.status)) { reviewedAt = atTime(addDays(at0, 8), '09:00'); reviewer = co; }
    selDocRows.push([uid(`sel:${app.id}`), app.id, sd.name, sd.description, true, co, sd.status, fid, submittedAt ? T(submittedAt) : null, reviewer, sd.comment || null, reviewedAt ? T(reviewedAt) : null, T(at), T(reviewedAt || submittedAt || at)]);
  }
}

// 4b. Hilos académicos
const staff = {}; // helpers
const asg = []; // asignaciones (admin_db)
const asgHistory = [];
const asgPatches = []; // UPDATE de columnas que el INSERT masivo no cubre (decline_reason, declined_at…)
const records = [], submissions = [], subHistory = [];
const deliverablesRows = [], attachRows = [], commentRows = [];
const docRows = [], docReqRows = [], finalReqRows = [];
const evalRows = [], ratingRows = [];
/** 0-5 (estrellas) → 0-100 (escala real de evaluation-service). */
const toScale100 = (stars) => Math.round(stars * 20 * 100) / 100;
const projectState = {}; // proyecto -> {positionsFilled}

const interviewTypes = ['video', 'in_person', 'technical'];
let threadNo = 0;
for (const t of threads) {
  threadNo++;
  const proj = P[t.project], stu = S[t.student], co = proj.company;
  const ds = dateFor[t.project];
  const applied = col(t.applied);
  const done = t.stage === 'completed';
  const LATE = ['finalizing', 'waiting_final_docs', 'final_docs_review']; // etapas de cierre
  const late = LATE.includes(t.stage);
  const started = ['active', 'completed', ...LATE].includes(t.stage);
  const app = { id: uid(`app:${t.project}:${t.student}`), pk: t.project, sk: t.student, applied, letter: t.letter, thread: t };
  const D_ = {
    reviewed: atTime(addDays(applied, 2), '10:00'),
    shortlisted: atTime(addDays(applied, 3), '15:00'),
    interview: atTime(addDays(applied, 5), '10:00'),
    accepted: atTime(addDays(applied, 8), '11:30'),
    assigned: atTime(addDays(applied, 9), '09:30'),
    asesorOk: atTime(addDays(applied, 11), '10:00'),
    anteSub: atTime(addDays(applied, 17), '10:00'),
  };
  D_.anteDone = atTime(addDays(D_.anteSub, t.correction ? 16 : 7), '09:00');
  D_.docsDone = atTime(addDays(D_.anteDone, 4), '12:00');
  const start = ds.start;
  D_.agreement = started ? atTime(addDays(start, -2), '11:00') : null;
  const end = done || late ? ds.end : null;
  const completedAt = done ? atTime(ds.end, '17:00') : null;

  // Estado final de la aplicación y su timeline
  app.status = done ? 'completed' : 'in_progress';
  const by = co.userId;
  tl(app, 'pending', 'under_review', D_.reviewed, by, 'Postulación en revisión por el equipo de talento.');
  tl(app, 'under_review', 'shortlisted', D_.shortlisted, by, 'Preseleccionado/a: perfil muy alineado con el proyecto.');
  tl(app, 'shortlisted', 'interview', atTime(addDays(applied, 4), '11:00'), by, 'Entrevista programada con el equipo técnico.');
  tl(app, 'interview', 'accepted', D_.accepted, by, 'Entrevista superada; se acepta la postulación.');
  tl(app, 'accepted', 'pending_supervisor', D_.assigned, ADMIN_ID, 'Asesor académico asignado; pendiente de aceptación.');
  tl(app, 'pending_supervisor', 'in_progress', D_.asesorOk, ADMIN_ID, 'Proyecto iniciado tras aceptación del asesor.');
  if (done) tl(app, 'in_progress', 'completed', completedAt, by, 'Proyecto finalizado: documentos finales aprobados y nota registrada.');
  app.reviewedAt = D_.reviewed; app.reviewedBy = by; app.acceptedAt = D_.accepted; app.completedAt = completedAt;
  app.updatedAt = completedAt || (late ? D_.docsDone : D_.asesorOk);
  apps.push(app);
  projectState[t.project] = { filled: 1 };

  // Entrevista (ya realizada)
  const itype = interviewTypes[threadNo % 3];
  interviewRows.push([uid(`iv:${app.id}`), app.id, T(D_.interview), 60, itype,
    itype === 'in_person' ? co.locations[0].address + ', ' + co.locations[0].city : null,
    itype !== 'in_person' ? `https://meet.example.com/${slugify(co.name).slice(0, 18)}-${stu.key.toLowerCase()}` : null,
    'completed', co.userId, 'Buen dominio técnico y comunicación clara; resolvió con criterio el caso planteado.', null, 4.5 + (threadNo % 4) / 10, 'passed',
    'Seleccionado/a para el proyecto: encaja con el perfil buscado.', true, T(D_.interview), T(D_.interview)]);

  // Prueba técnica de selección (solo si se definió)
  if (t.selectionDoc) {
    const f = addFile({ key: `sel:${app.id}`, owner: stu.userId, name: 'solucion-prueba-tecnica.pdf', category: 'interview_attachment', entityType: 'selection_document_request', entityId: uid(`sel:${app.id}`), at: atTime(addDays(applied, 4), '19:00'),
      lines: [`Estudiante: ${stu.fullName}`, `Proyecto: ${proj.title}`, 'Resumen: API REST con autenticación JWT, pruebas unitarias y Dockerfile.', 'Repositorio y README incluidos en la entrega original.'] });
    selDocRows.push([uid(`sel:${app.id}`), app.id, t.selectionDoc.name, t.selectionDoc.description, true, co.userId, t.selectionDoc.status, f, T(atTime(addDays(applied, 4), '19:00')), co.userId, t.selectionDoc.comment, T(atTime(addDays(applied, 5), '09:00')), T(atTime(addDays(applied, 3), '12:00')), T(atTime(addDays(applied, 5), '09:00'))]);
  }

  // ── Asignaciones (admin_db) ──
  const asesor = supervisors[t.asesor];
  const asgStatus = done ? 'completed' : 'accepted';
  const mkAsg = (role, code, startAt, acceptedAt) => {
    const sup = supervisors[code];
    const id = uid(`asg:${t.student}:${role}:${code}`);
    const st = role === 'asesor' && !done && t.asesorStatus ? t.asesorStatus : asgStatus;
    asg.push([id, sup.id, stu.userId, proj.id, app.id, periodIds[t.period], ADMIN_ID, role, D(startAt), done ? D(ds.end) : null, st, T(acceptedAt), null, T(addDays(acceptedAt, -1)), programs[stu.program].id]);
    asgHistory.push([uid(`asgh:${id}:created`), id, 'created', null, sup.id, null, ADMIN_ID, T(addDays(acceptedAt, -1))]);
    asgHistory.push([uid(`asgh:${id}:accepted`), id, 'accepted', null, sup.id, null, sup.userId, T(acceptedAt)]);
    if (done) asgHistory.push([uid(`asgh:${id}:completed`), id, 'completed', null, sup.id, 'Proceso académico finalizado.', ADMIN_ID, T(completedAt)]);
    return id;
  };
  const asesorAsg = mkAsg('asesor', t.asesor, D_.asesorOk, D_.asesorOk);
  for (const code of t.jurados) mkAsg('jurado_anteproyecto', code, D_.anteSub, atTime(addDays(D_.anteSub, -3), '10:30'));
  if (t.final) mkAsg('jurado_final', t.final, atTime(addDays(ds.end, -14), '09:00'), atTime(addDays(ds.end, -13), '10:00'));
  // Asignaciones adicionales en otros estados (declinada, desvinculada, reemplazada…)
  for (const x of t.extraAsg || []) {
    const sup = supervisors[x.code];
    const id = uid(`asg:${t.student}:${x.role}:${x.code}:${x.status}`);
    const when = atTime(addDays(applied, 12), '10:00');
    asg.push([id, sup.id, stu.userId, proj.id, app.id, periodIds[t.period], ADMIN_ID, x.role, D(when), null, x.status, x.status === 'declined' ? null : T(when), null, T(addDays(when, -1)), programs[stu.program].id]);
    asgHistory.push([uid(`asgh:${id}:created`), id, 'created', null, sup.id, null, ADMIN_ID, T(addDays(when, -1))]);
    if (x.status === 'declined') asgPatches.push(`UPDATE supervisor_assignments SET decline_reason = ${val(x.reason)}, declined_at = ${val(T(addDays(when, 1)))} WHERE id = ${val(id)};`);
    if (x.status === 'disconnected') asgPatches.push(`UPDATE supervisor_assignments SET disconnected_at = ${val(T(addDays(when, 40)))}, notes = ${val(x.reason)} WHERE id = ${val(id)};`);
    if (x.status === 'replaced') asgPatches.push(`UPDATE supervisor_assignments SET notes = ${val(x.reason)} WHERE id = ${val(id)};`);
    asgHistory.push([uid(`asgh:${id}:${x.status}`), id, x.status, null, sup.id, x.reason || null, ADMIN_ID, T(addDays(when, 1))]);
  }

  // ── Anteproyecto ──
  const subId = uid(`sub:${t.student}`);
  const asesorUser = asesor.userId;
  const jurUsers = t.jurados.map((c) => supervisors[c].userId);
  const anteTitle = `Anteproyecto — ${proj.title}`;
  const waitingAnte = t.stage === 'waiting_anteproyecto';
  // approved (por defecto fuera de esta etapa) | under_review | pending_submission | needs_revision | revised
  const anteMode = waitingAnte ? (t.anteState || 'under_review') : 'approved';
  const sentAnte = anteMode !== 'pending_submission';
  const mkAnteFile = (v, at, lines) => addFile({ key: `ante${v}:${t.student}`, owner: stu.userId, name: `anteproyecto-${slugify(proj.title).slice(0, 36)}-v${v}.pdf`, category: 'academic_document', entityType: 'academic_submission', entityId: subId, at, lines });
  let currentFile = null, version = 0, corrections = 0;
  const history = [];
  const votes = {};
  if (sentAnte) {
    const f1 = mkAnteFile(1, D_.anteSub, [anteTitle, `Estudiante: ${stu.fullName} · ${programs[stu.program].name}`, `Empresa: ${proj.company.name}`, 'Contenido: planteamiento del problema, objetivos, alcance, metodología, cronograma y referencias.', `Duración acordada: ${proj.months} meses.`]);
    currentFile = f1; version = 1;
    history.push(['submitted', stu.userId, 'student', 'Primera versión del anteproyecto enviada.', f1, 1, D_.anteSub]);
  }
  const wantsCorrection = (t.correction && !waitingAnte) || anteMode === 'needs_revision' || anteMode === 'revised';
  if (wantsCorrection) {
    history.push(['asesor_commented', asesorUser, 'faculty', 'Revisé el documento: ajusta la sección de metodología y detalla los criterios de éxito antes de que lo evalúe el jurado.', null, 1, atTime(addDays(D_.anteSub, 2), '10:00')]);
    history.push(['correction_requested', jurUsers[0], 'faculty', 'Se solicita precisar el alcance y justificar la elección de las herramientas. Se otorgan 7 días para la corrección.', null, 1, atTime(addDays(D_.anteSub, 5), '15:00')]);
    corrections = 1;
  }
  if ((t.correction && !waitingAnte) || anteMode === 'revised') {
    const f2 = mkAnteFile(2, atTime(addDays(D_.anteSub, 11), '09:30'), [anteTitle + ' (versión 2)', `Estudiante: ${stu.fullName}`, 'Cambios: metodología detallada, criterios de éxito medibles y justificación de herramientas.']);
    history.push(['revised', stu.userId, 'student', 'Versión 2 con las correcciones solicitadas por jurado y asesor.', f2, 2, atTime(addDays(D_.anteSub, 11), '09:30')]);
    currentFile = f2; version = 2;
  }
  if (anteMode === 'under_review') votes[jurUsers[0]] = 'approve';
  if (anteMode === 'approved') { jurUsers.forEach((u) => { votes[u] = 'approve'; }); history.push(['approved', jurUsers[jurUsers.length - 1], 'faculty', 'Anteproyecto aprobado: propuesta clara, viable y bien fundamentada.', null, version, D_.anteDone]); }
  const subStatus = anteMode === 'approved' ? 'approved' : anteMode; // los demás modos coinciden con el enum
  const subSubmittedAt = !sentAnte ? null : version === 2 ? atTime(addDays(D_.anteSub, 11), '09:30') : D_.anteSub;
  const anteNote = {
    approved: 'Aprobado: propuesta viable, objetivos claros y cronograma realista.',
    under_review: 'Revisión en curso: un jurado ya aprobó, falta el voto del segundo.',
    pending_submission: 'Aún no se ha cargado la primera versión del anteproyecto.',
    needs_revision: 'Se solicitaron correcciones de alcance y metodología; el estudiante debe enviar una nueva versión.',
    revised: 'El estudiante envió la versión corregida; pendiente de nueva revisión del jurado.',
  }[anteMode];
  submissions.push([subId, app.id, 'anteproyecto', subStatus, currentFile, version, corrections, J(votes), anteNote,
    t.correction || wantsCorrection ? 'Buen avance; atender las observaciones de metodología.' : 'Documento bien estructurado; listo para evaluación del jurado.',
    wantsCorrection && version === 2 ? 'Se incorporaron todas las observaciones en la versión 2.' : null,
    ['under_review', 'revised'].includes(anteMode) ? T(dayOffset(5, '17:00')) : null,
    ['pending_submission', 'needs_revision'].includes(anteMode) ? T(dayOffset(anteMode === 'pending_submission' ? 9 : 4, '17:00')) : null,
    anteMode === 'approved' ? T(D_.anteDone) : null, subSubmittedAt ? T(subSubmittedAt) : null, T(D_.anteSub), T(anteMode === 'approved' ? D_.anteDone : (subSubmittedAt || D_.anteSub))]);
  history.forEach(([action, actor, role, comment, file, ver, at], i) => {
    subHistory.push([uid(`subh:${subId}:${i}`), subId, action, actor, role, comment, file, ver, T(at)]);
  });

  // ── Registro académico ──
  const recId = uid(`rec:${t.student}`);
  const recStatus = { completed: 'completed', active: 'active', waiting_documents: 'waiting_documents', waiting_anteproyecto: 'waiting_anteproyecto', finalizing: 'finalizing', waiting_final_docs: 'waiting_final_docs', final_docs_review: 'final_docs_review' }[t.stage];
  let agreementFile = null, gradeFile = null;
  if (started) {
    agreementFile = addFile({ key: `agr:${t.student}`, owner: stu.userId, name: 'acuerdo-de-iniciacion-firmado.pdf', category: 'academic_document', entityType: 'project_academic_record', entityId: recId, at: D_.agreement,
      lines: [`Acuerdo de iniciación — ${proj.title}`, `Estudiante: ${stu.fullName}`, `Empresa: ${proj.company.name}`, `Inicio oficial: ${ymd(start)} · Duración: ${proj.weeks || 16} semanas`, 'Firmado por estudiante, empresa y asesor académico.'] });
  }
  if (done) {
    gradeFile = addFile({ key: `grade:${t.student}`, owner: asesorUser, name: 'acta-de-nota-final.pdf', category: 'academic_document', entityType: 'project_academic_record', entityId: recId, at: atTime(ds.end, '16:00'),
      lines: [`Acta de nota final — ${proj.title}`, `Estudiante: ${stu.fullName}`, `Nota final: ${t.grade.toFixed(1)} / 100`, 'Registrada por el asesor académico tras la aprobación de los documentos finales.'] });
  }
  records.push([recId, app.id, asesorAsg, subId, agreementFile, started ? D(start) : null, started ? proj.weeks : null, started ? D(ds.end) : null, done || late ? D(ds.end) : null,
    gradeFile, done ? t.grade : null, recStatus, done || late, done, T(D_.asesorOk), T(app.updatedAt)]);

  // ── Documentos iniciales (carta, póliza, certificado) ──
  const pastAnte = t.stage !== 'waiting_anteproyecto';
  if (pastAnte) {
    const mkDoc = (req, actor, submitter, status, tag, submittedAt, reviewedAt) => {
      const rowId = uid(`doc:${t.student}:${tag}`);
      const fid = status === 'pending' ? null : addFile({ key: `docf:${t.student}:${tag}`, owner: submitter, name: `${slugify(req.name)}.pdf`, category: 'academic_document', entityType: 'project_document', entityId: rowId, at: submittedAt,
        lines: [req.name, `Estudiante: ${stu.fullName}`, `Proyecto: ${proj.title}`, 'Documento de ejemplo cargado para el proceso de iniciación.'] });
      const reviewed = status === 'approved' || status === 'rejected';
      const note = status === 'approved' ? 'Documento verificado y aprobado.' : status === 'rejected' ? 'La póliza no cubre todo el período de la práctica y no está firmada; corrige y vuelve a cargarla.' : null;
      docRows.push([rowId, app.id, req.id, req.name, 'initial', actor, submitter, fid, status, reviewed ? ADMIN_ID : null, note, status === 'pending' ? null : T(submittedAt), reviewed ? T(reviewedAt) : null, T(D_.anteDone), T(reviewedAt || submittedAt || D_.anteDone)]);
      // Las filas ya sembradas no se actualizan con ON CONFLICT DO NOTHING: se asegura el estado con un UPDATE idempotente.
      if (status === 'rejected') raw.application_db.push(`UPDATE project_documents SET status = 'rejected', reviewer_id = ${val(ADMIN_ID)}, reviewer_comment = ${val(note)}, reviewed_at = ${val(T(reviewedAt))} WHERE id = ${val(rowId)} AND status <> 'rejected';`);
    };
    const dAt = (n) => atTime(addDays(D_.anteDone, n), '14:00');
    docReqRows.push([uid(`dreq:${t.student}:carta`), app.id, reqCarta.id, ADMIN_ID, T(D_.anteDone)]);
    docReqRows.push([uid(`dreq:${t.student}:poliza`), app.id, reqPoliza.id, ADMIN_ID, T(D_.anteDone)]);
    mkDoc(reqCarta, 'company', co.userId, 'approved', 'carta', dAt(1), dAt(2));
    if (t.stage === 'waiting_documents') {
      if (t.docState === 'rejected') mkDoc(reqPoliza, 'student', stu.userId, 'rejected', 'poliza', atTime(addDays(TODAY, -6), '16:30'), atTime(addDays(TODAY, -4), '10:00'));
      else mkDoc(reqPoliza, 'student', stu.userId, 'submitted', 'poliza', atTime(addDays(TODAY, -2), '16:30'), null);
    } else {
      mkDoc(reqPoliza, 'student', stu.userId, 'approved', 'poliza', dAt(1), dAt(3));
      docReqRows.push([uid(`dreq:${t.student}:cert`), app.id, reqCert.id, ADMIN_ID, T(D_.anteDone)]);
      mkDoc(reqCert, 'student', stu.userId, 'approved', 'cert', dAt(2), dAt(3));
    }
  }

  // ── Documentos finales ──
  if (done || late) {
    const fin = [
      { tag: 'informe', name: 'Informe final del proyecto', desc: 'Documento final con objetivos, metodología, resultados, conclusiones y recomendaciones.', actor: 'student', who: stu.userId },
      { tag: 'cert', name: 'Certificación de cumplimiento de la empresa', desc: 'Certificación firmada por la empresa que confirma el desarrollo y la calidad del trabajo del estudiante.', actor: 'company', who: co.userId },
    ];
    fin.forEach((f, i) => {
      const reqId = uid(`freq:${t.student}:${f.tag}`);
      finalReqRows.push([reqId, app.id, f.name, f.desc, f.actor, true, i + 1, ADMIN_ID, T(atTime(addDays(ds.end, -21), '10:00'))]);
      const rowId = uid(`fdoc:${t.student}:${f.tag}`);
      const dstate = (t.finalDocs && t.finalDocs[f.tag]) || 'approved'; // approved | submitted | rejected | pending
      const submittedAt = dstate === 'pending' ? null : atTime(addDays(ds.end, -10 + i), '16:00');
      const reviewedAt = ['approved', 'rejected'].includes(dstate) ? atTime(addDays(ds.end, -7 + i), '10:00') : null;
      const fid = dstate === 'pending' ? null : addFile({ key: `fdocf:${t.student}:${f.tag}`, owner: f.who, name: `${slugify(f.name)}.pdf`, category: 'academic_document', entityType: 'project_document', entityId: rowId, at: submittedAt,
        lines: [f.name, `Estudiante: ${stu.fullName}`, `Proyecto: ${proj.title}`, `Empresa: ${proj.company.name}`, dstate === 'approved' ? 'Documento final de ejemplo aprobado por la coordinación académica.' : 'Documento final de ejemplo en revisión por la coordinación académica.'] });
      const comment = dstate === 'approved' ? 'Documento completo; se aprueba.' : dstate === 'rejected' ? 'Faltan las conclusiones y las recomendaciones; completa el documento y vuelve a enviarlo.' : null;
      docRows.push([rowId, app.id, reqId, f.name, 'final', f.actor, f.who, fid, dstate, dstate === 'approved' || dstate === 'rejected' ? ADMIN_ID : null, comment, submittedAt ? T(submittedAt) : null, reviewedAt ? T(reviewedAt) : null, T(atTime(addDays(ds.end, -21), '10:00')), T(reviewedAt || submittedAt || atTime(addDays(ds.end, -21), '10:00'))]);
    });
  }

  // ── Entregables del estudiante ──
  if (['active', 'completed', ...LATE].includes(t.stage)) {
    const sisTypes = ['report', 'code', 'document'], otherTypes = ['report', 'document', 'report'];
    const dtypes = stu.program === 'SIS' ? sisTypes : otherTypes;
    // estados por hilo
    const activeStates = { S8: ['approved', 'submitted', 'pending'], S9: ['approved', 'needs_revision', 'pending'], S10: ['submitted', 'pending', 'pending'], E1: ['approved', 'rejected', 'pending'], V2: ['approved', 'submitted', 'pending'] };
    const states = activeStates[t.student] || ['approved', 'approved', 'approved'];
    const feedbackPool = ['Entrega clara y completa; cumple los criterios acordados.', 'Muy buen nivel de detalle y buenas decisiones técnicas.', 'Documentación ordenada y resultados bien sustentados.'];
    const delIds = [];
    proj.deliverables.forEach(([title, description, , days], i) => {
      const delId = uid(`sdel:${t.student}:${i}`);
      delIds.push(delId);
      const due = atTime(addDays(start, days), '23:59');
      const status = states[i] || 'pending';
      const submitted = ['approved', 'submitted', 'needs_revision', 'rejected'].includes(status);
      const submittedAt = submitted ? (status === 'approved' ? atTime(addDays(due, -3 - (i % 2)), '16:00') : atTime(addDays(TODAY, -(2 + i)), '15:00')) : null;
      const reviewedAt = ['approved', 'needs_revision', 'rejected'].includes(status) ? atTime(addDays(submittedAt, 2), '11:00') : null;
      let fid = null;
      if (submitted) {
        fid = addFile({ key: `delf:${t.student}:${i}`, owner: stu.userId, name: `${slugify(title).slice(0, 44)}.pdf`, category: 'deliverable', entityType: 'student_deliverable', entityId: delId, at: submittedAt,
          lines: [title, `Estudiante: ${stu.fullName}`, `Proyecto: ${proj.title}`, description] });
        attachRows.push([uid(`datt:${delId}`), delId, fileUrl(fid), `${slugify(title).slice(0, 44)}.pdf`, 2048, 'application/pdf', stu.userId, T(submittedAt)]);
      }
      const feedback = status === 'approved' ? feedbackPool[i % 3] : status === 'needs_revision' ? 'Falta sustentar la validación con datos reales; ajusta y vuelve a enviar.' : status === 'rejected' ? 'El entregable no cumple los criterios acordados (faltan las pruebas y los resultados); se rechaza y debe rehacerse.' : null;
      const grade = status === 'approved' ? Math.round((4.3 + ((threadNo + i) % 6) / 10) * 10) / 10 : null;
      deliverablesRows.push([delId, app.id, uid(`pdel:${proj.key}:${i}`), title, description, dtypes[i], T(due), co.userId, 'company', T(start), fid ? fileUrl(fid) : null, fid ? 'application/pdf' : null,
        submittedAt ? T(submittedAt) : null, status, feedback, grade, reviewedAt ? co.userId : null, reviewedAt ? 'company' : null, reviewedAt ? T(reviewedAt) : null, 1, T(start), T(reviewedAt || submittedAt || start)]);
      // Comentarios: hilo de conversación en el primer entregable aprobado y en el que pide revisión
      if (i === 0 && status === 'approved') {
        const c0 = uid(`dcom:${delId}:0`);
        commentRows.push([c0, delId, null, co.userId, 'company', 'Excelente primer entregable: la estructura es clara y los supuestos están bien documentados.', false, T(atTime(addDays(submittedAt, 1), '10:30')), T(atTime(addDays(submittedAt, 1), '10:30')), null]);
        commentRows.push([uid(`dcom:${delId}:1`), delId, c0, stu.userId, 'student', 'Gracias por la retroalimentación; en el siguiente entregable profundizaré en las pruebas.', false, T(atTime(addDays(submittedAt, 1), '14:15')), T(atTime(addDays(submittedAt, 1), '14:15')), null]);
        commentRows.push([uid(`dcom:${delId}:2`), delId, null, asesorUser, 'faculty', 'Nota interna: buen ritmo del estudiante; revisar la profundidad del análisis de riesgos en la próxima revisión.', true, T(atTime(addDays(submittedAt, 2), '09:00')), T(atTime(addDays(submittedAt, 2), '09:00')), null]);
      }
      if (status === 'needs_revision') {
        const c0 = uid(`dcom:${delId}:0`);
        commentRows.push([c0, delId, null, co.userId, 'company', 'Necesitamos ver la validación con datos reales de producción antes de aprobar este entregable.', false, T(atTime(addDays(reviewedAt, 0), '12:00')), T(atTime(addDays(reviewedAt, 0), '12:00')), null]);
        commentRows.push([uid(`dcom:${delId}:1`), delId, c0, stu.userId, 'student', 'Entendido. Esta semana pruebo con los datos del acopio y envío la versión ajustada.', false, T(atTime(addDays(reviewedAt, 0), '17:40')), T(atTime(addDays(reviewedAt, 0), '17:40')), null]);
      }
    });
  }

  // ── Evaluaciones (solo completados) ──
  if (done) {
    const ev = t.eval;
    const defs = [
      ['company_evaluates_student', co.userId, stu.userId, ev.c2s, 3, ev.c2s.strengths, ev.c2s.improve],
      ['student_evaluates_company', stu.userId, co.userId, ev.s2c, 4, ev.s2c.strengths, ev.s2c.improve],
      ['supervisor_evaluates_student', asesorUser, stu.userId, ev.a2s, 5, 'Cumplimiento de hitos académicos, calidad de la documentación y autonomía.', 'Profundizar en el análisis crítico de las limitaciones del trabajo.'],
      ['student_evaluates_supervisor', stu.userId, asesorUser, ev.s2a, 6, 'Disponibilidad, claridad de las observaciones y conocimiento técnico.', 'Agendar las reuniones de seguimiento con mayor regularidad.'],
    ];
    defs.forEach(([type, evaluator, evaluated, data, off, strengths, improve]) => {
      const evId = uid(`eval:${t.student}:${type}`);
      const doneAt = atTime(addDays(ds.end, off), '10:00');
      let overall = data.score;
      const crit = criteria[type];
      if (crit && crit.length) {
        const deltas = [0.2, -0.1, 0.1, -0.2, 0];
        const scores = crit.map((c, i) => Math.max(3, Math.min(5, Math.round((data.score + deltas[i % 5]) * 10) / 10)));
        overall = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
        // El backend guarda calificaciones en escala 0-100 (DTO @Max(100), la UI divide entre 20).
        crit.forEach((c, i) => ratingRows.push([uid(`rate:${evId}:${c.id}`), evId, c.id, toScale100(scores[i]), null, T(doneAt)]));
      }
      // `overall` queda en 0-5 para promediar los ratings de perfil (average_rating/rating, que son 0-5);
      // en evaluations.overall_score se guarda en 0-100.
      evalRows.push([evId, app.id, proj.id, evaluator, evaluated, type, 'completed', toScale100(overall), data.comment, strengths, improve, (t.anonymous || []).includes(type), T(addDays(ds.end, 14)), T(doneAt), T(addDays(ds.end, 1)), T(doneAt)]);
      if (type === 'student_evaluates_company') { C[co.key].rating += overall; C[co.key].reviews += 1; }
      if (type === 'company_evaluates_student' || type === 'supervisor_evaluates_student') studentRatings[stu.key].push(overall);
    });
  }

  // ── Evaluaciones pendientes: al entrar en cierre se abren las cuatro, para poder demostrar el flujo de
  //    evaluar (la pestaña "Pendientes" de estudiante, empresa y docente). No afectan los promedios. ──
  if (['finalizing', 'final_docs_review'].includes(t.stage)) {
    [
      ['company_evaluates_student', co.userId, stu.userId],
      ['student_evaluates_company', stu.userId, co.userId],
      ['supervisor_evaluates_student', asesorUser, stu.userId],
      ['student_evaluates_supervisor', stu.userId, asesorUser],
    ].forEach(([type, evaluator, evaluated]) => {
      const evId = uid(`eval:${t.student}:${type}`);
      evalRows.push([evId, app.id, proj.id, evaluator, evaluated, type, 'pending', null, null, null, null, false, T(addDays(TODAY, 10)), null, T(addDays(TODAY, -3)), T(addDays(TODAY, -3))]);
    });
  }
}

// ═════════════════════════════ 4c. CAPA "DEPARTAMENTOS" (docentes, admins, notificaciones, chat…) ═════════════════════════════
emitExtras({ ins, uid, T, D, J, A, val, col, addDays, atTime, dayOffset, TODAY, S, P, C, apps, supervisors, programs, ADMIN_ID, PASSWORD_HASH, periodIds,
  USERS_COLS, USER_PROFILE_COLS, evalRows, asg, asgHistory, asgPatches, threads, students, raw });

// ═════════════════════════════ 5. EMISIÓN DE FILAS (estudiantes, empresas, proyectos…) ═════════════════════════════
const completedStudents = new Set(threads.filter((t) => t.stage === 'completed').map((t) => t.student));
const thesisOf = {};
for (const t of threads) if (P[t.project].type === 'thesis') thesisOf[t.student] = P[t.project].title;

// ── Estudiantes ──
students.forEach((s0, i) => {
  const s = S[s0.key];
  const prog = programs[s.program];
  const created = col(`2025-0${6 + (i % 3)}-${p2(8 + (i % 20))} 10:00`);
  const lastLogin = dayOffset(-(i % 9), '19:10');
  // Registro sin verificar el correo: solo existe la cuenta (el perfil se crea al verificar).
  if (s.account === 'unverified') {
    ins('auth_db', 'users', USERS_COLS,
      [[s.userId, s.email, PASSWORD_HASH, 'student', false, true, true, T(created), 'v1.0', true, 0, null, null, T(dayOffset(-3, '16:20')), T(dayOffset(-3, '16:20'))]]);
    return;
  }
  const incomplete = !!s.incomplete;
  const enrollment = 2026 - Math.floor((s.semester - 1) / 2);
  const graduation = s.semester >= 10 ? 2026 : 2027;
  const ratings = studentRatings[s.key];
  const avg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : 0;
  const cvId = addFile({ key: `cv:${s.key}`, owner: s.userId, name: `CV - ${s.fullName}.pdf`, category: 'cv', entityType: 'student_profile', entityId: s.profileId, at: created,
    lines: [s.headline, `${prog.name} · Semestre ${s.semester} · Universidad de Nariño`, `Skills: ${s.skills.map(([n]) => skillRef(n).display).join(', ')}`,
      ...s.exp.map((e) => `Experiencia: ${e.title} — ${e.company}`), `Idiomas: Español (nativo)${s.langs.length ? ', ' + s.langs.map((l) => l[0]).join(', ') : ''}`] });
  s.cvUrl = fileUrl(cvId);

  const locked = s.account === 'locked';
  ins('auth_db', 'users', USERS_COLS,
    [[s.userId, s.email, PASSWORD_HASH, 'student', true, s.account !== 'inactive', true, T(created), 'v1.0', true, locked ? 5 : 0, locked ? T(dayOffset(30, '08:00')) : null, T(lastLogin), T(created), T(created)]]);
  ins('user_db', 'user_profiles', USER_PROFILE_COLS,
    [[uid(`st-uprof:${s.key}`), s.userId, 'student', s.first, s.last, 'Colombia', 'Pasto', 'Nariño', s.bio, D(col(s.dob)), s.gender, null, incomplete ? 35 : 100, !incomplete, T(lastLogin), T(created), T(created)]]);
  ins('student_db', 'student_profiles', ['id', 'user_id', 'program', 'program_id', 'faculty', 'semester', 'student_code', 'enrollment_year', 'expected_graduation_year', 'gpa', 'total_credits_completed', 'total_credits_required', 'bio', 'headline', 'cv_url', 'availability', 'preferred_work_mode', 'available_hours_per_week', 'willing_to_relocate', 'has_completed_internship', 'internship_count', 'average_rating', 'total_ratings', 'profile_completeness', 'is_visible', 'created_at', 'updated_at'],
    [[s.profileId, s.userId, prog.name, prog.id, 'Facultad de Ingeniería', s.semester, `${enrollment}${52000 + s.idx}`, enrollment, graduation, s.gpa, Math.round(160 * (s.semester - 1) / 10), 160, s.bio, s.headline, s.cvUrl, s.availability, s.mode, s.hours, s.relocate,
      completedStudents.has(s.key), completedStudents.has(s.key) ? 1 : 0, avg, ratings.length, incomplete ? 35 : 100, !incomplete, T(created), T(lastLogin)]]);
  ins('student_db', 'skills', ['id', 'student_id', 'name', 'catalog_skill_id', 'category', 'proficiency_level', 'years_of_experience', 'is_verified', 'display_order', 'created_at', 'updated_at'],
    s.skills.map(([n, level, years], k) => { const c = skillRef(n); return [uid(`skill:${s.key}:${n}`), s.profileId, c.display, c.id, c.category, level, years, false, k, T(created), T(created)]; }));
  ins('student_db', 'experiences', ['id', 'student_id', 'type', 'title', 'company_name', 'description', 'start_date', 'end_date', 'is_current', 'location', 'work_mode', 'achievements', 'technologies_used', 'display_order', 'created_at', 'updated_at'],
    s.exp.map((e, k) => [uid(`exp:${s.key}:${k}`), s.profileId, e.type, e.title, e.company, e.desc, D(col(e.start)), e.end ? D(col(e.end)) : null, !!e.current, 'Pasto, Nariño', e.type === 'freelance' ? 'remote' : 'on_site', A(e.ach), A(e.tech), k, T(created), T(created)]));
  ins('student_db', 'education', ['id', 'student_id', 'institution', 'degree', 'field_of_study', 'description', 'start_date', 'end_date', 'is_current', 'gpa', 'achievements', 'thesis_title', 'display_order', 'created_at', 'updated_at'],
    [[uid(`edu:${s.key}`), s.profileId, 'Universidad de Nariño', prog.name, prog.name, `Programa de ${prog.name} de la Facultad de Ingeniería, actualmente en el semestre ${s.semester}.`, D(col(`${enrollment}-02-01`)), null, true, s.gpa,
      A([`Promedio acumulado de ${s.gpa.toFixed(2)} sobre 5,0`, 'Participación en actividades de extensión de la Facultad de Ingeniería']), thesisOf[s.key] || null, 0, T(created), T(created)]]);
  ins('student_db', 'languages', ['id', 'student_id', 'language', 'proficiency', 'is_native', 'certification_name', 'certification_score', 'display_order', 'created_at', 'updated_at'],
    [[uid(`lang:${s.key}:es`), s.profileId, 'Español', 'native', true, null, null, 0, T(created), T(created)],
     ...s.langs.map(([lang, prof, cert, score], k) => [uid(`lang:${s.key}:${lang}`), s.profileId, lang, prof, false, cert, score, k + 1, T(created), T(created)])]);
  ins('student_db', 'interests', ['id', 'student_id', 'area', 'sub_area', 'priority', 'display_order', 'created_at'],
    s.interests.map(([area, sub], k) => [uid(`int:${s.key}:${k}`), s.profileId, area, sub, k + 1, k, T(created)]));
  ins('student_db', 'certifications', ['id', 'student_id', 'name', 'issuing_organization', 'issue_date', 'is_permanent', 'credential_id', 'display_order', 'created_at', 'updated_at'],
    s.certs.map((c, k) => [uid(`cert:${s.key}:${k}`), s.profileId, c.name, c.org, D(col(c.date)), true, c.id, k, T(created), T(created)]));
});

// ── Empresas ──
const projectCount = (ck) => projects.filter((p) => p.co === ck && ['published', 'in_progress', 'completed'].includes(p.status)).length;
for (const c of Object.values(C)) {
  const created = col(c.createdAt);
  const rating = c.reviews ? Math.round((c.rating / c.reviews) * 100) / 100 : 0;
  const status = c.status;
  const progIds = c.programKeys.map((k) => programs[k].id);
  const decided = status !== 'pending';
  ins('company_db', 'companies', ['id', 'user_id', 'company_name', 'legal_name', 'nit', 'industry', 'company_size', 'description', 'website', 'logo_url', 'founded_year', 'headquarters_city', 'headquarters_state', 'employee_count', 'verification_status', 'rating', 'total_reviews', 'total_projects', 'profile_completeness', 'is_active', 'created_at', 'updated_at', 'program_ids', 'reviewed_by', 'reviewed_at'],
    [[c.companyId, c.userId, c.name, c.legal, c.nit, c.industry, c.size, c.description, c.website, null, c.founded, c.city, c.state, c.employees, status, rating, c.reviews, projectCount(c.key), status === 'pending' ? 70 : 95, status !== 'rejected', T(created), T(addDays(created, 3)),
      new Raw(`ARRAY[${progIds.map((i) => `'${i}'`).join(', ')}]::uuid[]`), decided ? ADMIN_ID : null, decided ? T(addDays(created, 3)) : null]]);
  ins('company_db', 'company_locations', ['id', 'company_id', 'name', 'address', 'city', 'state', 'country', 'is_headquarters', 'is_active', 'created_at'],
    c.locations.map((l, k) => [uid(`loc:${c.key}:${k}`), c.companyId, l.name, l.address, l.city, l.state, 'Colombia', l.hq, true, T(created)]));
  ins('company_db', 'company_contacts', ['id', 'company_id', 'first_name', 'last_name', 'position', 'email', 'is_primary', 'is_active', 'created_at', 'updated_at'],
    [[uid(`contact:${c.key}:1`), c.companyId, c.contact.first, c.contact.last, c.contact.position, c.contact.email, true, true, T(created), T(created)],
     [uid(`contact:${c.key}:2`), c.companyId, c.contact2.first, c.contact2.last, c.contact2.position, c.contact2.email, false, true, T(created), T(created)]]);
  ins('company_db', 'business_areas', ['id', 'company_id', 'area_name', 'description', 'display_order', 'created_at'],
    c.areas.map(([n, d], k) => [uid(`area:${c.key}:${k}`), c.companyId, n, d, k, T(created)]));
  // Historial de verificación según el estado actual (una empresa pendiente aún no tiene decisión).
  const verRows = [];
  if (status === 'verified' || status === 'suspended') {
    verRows.push([uid(`cver:${c.key}`), c.companyId, ADMIN_ID, 'approved', 'pending', 'verified', 'Documentación legal verificada (certificado de existencia y RUT).', 'Empresa verificada por coordinación de prácticas.', T(addDays(created, 3))]);
  }
  if (status === 'suspended') verRows.push([uid(`cver:${c.key}:susp`), c.companyId, ADMIN_ID, 'suspended', 'verified', 'suspended', c.reason, 'Suspensión registrada por la Facultad.', T(dayOffset(-20, '10:00'))]);
  if (status === 'rejected') verRows.push([uid(`cver:${c.key}:rej`), c.companyId, ADMIN_ID, 'rejected', 'pending', 'rejected', c.reason, 'Solicitud rechazada; la empresa puede reenviarla con los soportes corregidos.', T(addDays(created, 4))]);
  ins('admin_db', 'company_verifications', ['id', 'company_id', 'verified_by', 'action', 'previous_status', 'new_status', 'reason', 'notes', 'created_at'], verRows);
}

// ── Proyectos ──
const appsByProject = {};
for (const a of apps) (appsByProject[a.pk] ||= []).push(a);
for (const p of Object.values(P)) {
  const ds = dateFor[p.key];
  const mine = appsByProject[p.key] || [];
  const created = col(p.created);
  const approved = ['published', 'in_progress', 'completed', 'cancelled'].includes(p.status);
  const submitted = p.submitted ? col(p.submitted) : approved ? addDays(created, 1) : null;
  const reviewed = p.reviewed ? col(p.reviewed) : approved ? addDays(created, 2) : null;
  const progIds = p.programs.map((k) => programs[k].id).join(',');
  const reqFile = addFile({ key: `req:${p.key}`, owner: p.company.userId, name: `solicitud-formal-${slugify(p.title).slice(0, 40)}.pdf`, category: 'project_document', entityType: 'project', entityId: p.id, at: created,
    lines: [`Solicitud formal — ${p.title}`, `Empresa: ${p.company.name} · NIT ${p.company.nit}`, `Tipo: ${p.type} · Duración: ${p.months} meses · ${p.weekly} h/semana`, 'La empresa solicita la vinculación de un estudiante y se compromete a brindar acompañamiento técnico.'] });
  const slug = `${slugify(p.title).slice(0, 80)}-${p.co.toLowerCase()}`;
  const filled = (projectState[p.key] || {}).filled || 0;
  const updated = reviewed || created;
  ins('project_db', 'projects',
    ['id', 'company_id', 'created_by_user_id', 'title', 'slug', 'description', 'short_description', 'project_type', 'status', 'duration_months', 'weekly_hours', 'total_hours', 'start_date', 'end_date', 'location_type', 'location', 'compensation_type', 'compensation_amount', 'currency', 'positions_available', 'positions_filled', 'application_deadline', 'academic_programs', 'request_document_file_id', 'minimum_semester', 'is_active', 'is_featured', 'views_count', 'applications_count', 'faculty_review_notes', 'faculty_rejection_categories', 'faculty_reviewer_id', 'faculty_reviewed_at', 'submitted_for_review_at', 'created_at', 'updated_at'],
    [[p.id, p.company.userId, p.company.userId, p.title, slug, p.desc, p.short, p.type, p.status, p.months, p.weekly, p.months * 4 * p.weekly, ds.start ? D(ds.start) : null, ds.end ? D(ds.end) : null, p.loc, p.locText, p.comp[0], p.comp[1], 'COP', p.positions, filled,
      ds.deadline ? D(ds.deadline) : null, progIds, reqFile, p.minSem, true, !!p.featured, p.views, mine.length,
      p.facultyNotes || (approved ? 'Aprobado.' : null), p.rejCats ? p.rejCats.join(',') : null, reviewed ? ADMIN_ID : null, reviewed ? T(reviewed) : null, submitted ? T(submitted) : null, T(created), T(updated)]]);
  ins('project_db', 'project_skills', ['id', 'project_id', 'name', 'catalog_skill_id', 'category', 'proficiency_level', 'is_mandatory', 'display_order', 'created_at'],
    p.skills.map(([n, level, mand], k) => { const c = skillRef(n); return [uid(`pskill:${p.key}:${n}`), p.id, c.display, c.id, c.category, level, mand, k, T(created)]; }));
  const base = ds.start || addDays(TODAY, 30);
  ins('project_db', 'project_deliverables', ['id', 'project_id', 'title', 'description', 'due_date', 'weight_percentage', 'display_order', 'is_mandatory', 'created_at'],
    p.deliverables.map(([title, description, weight, days], k) => [uid(`pdel:${p.key}:${k}`), p.id, title, description, D(addDays(base, days)), weight, k + 1, true, T(created)]));
}

// ── Aplicaciones ──
const statusOf = (a) => (a.thread ? a.status : a.status);
// Proyectos del seed base que quedaron sin habilidades (p. ej. "App Móvil de Fidelización"): sin ellas
// matching-service los puntúa con 0 ("proyecto sin skills") y no se recomiendan a nadie.
{
  // Se excluye el proyecto "sin skills" que usa el e2e protegido de matching (matching-integration.e2e-spec.ts,
  // PROJECT_SIN_SKILLS): debe quedar SIN habilidades para validar el caso de dato legacy.
  const e2eNoSkillsFixture = '9f8ace78-f0a6-4a8b-8d69-536340f84415';
  const bare = psql('project_db', `SELECT id, title FROM projects p WHERE NOT EXISTS (SELECT 1 FROM project_skills s WHERE s.project_id = p.id) AND p.status IN ('published', 'in_progress', 'completed') AND p.id <> '${e2eNoSkillsFixture}'`);
  const defaults = [['react', 'intermediate', true], ['rest apis', 'intermediate', true], ['docker', 'beginner', false], ['comunicacion efectiva', 'beginner', false]];
  for (const [pid] of bare) {
    ins('project_db', 'project_skills', ['id', 'project_id', 'name', 'catalog_skill_id', 'category', 'proficiency_level', 'is_mandatory', 'display_order', 'created_at'],
      defaults.map(([n, level, mand], k) => { const c = skillRef(n); return [uid(`pskill-fix:${pid}:${n}`), pid, c.display, c.id, c.category, level, mand, k, T(TODAY)]; }));
  }
}

ins('application_db', 'applications',
  ['id', 'project_id', 'student_id', 'status', 'cover_letter', 'resume_url', 'match_score', 'applied_at', 'reviewed_at', 'reviewed_by', 'accepted_at', 'completed_at', 'rejection_reason', 'withdrawal_reason', 'notes', 'created_at', 'updated_at', 'program_id'],
  apps.map((a) => [a.id, P[a.pk].id, S[a.sk].userId, statusOf(a), a.letter, S[a.sk].cvUrl, null, T(a.applied), a.reviewedAt ? T(a.reviewedAt) : null, a.reviewedBy || null, a.acceptedAt ? T(a.acceptedAt) : null, a.completedAt ? T(a.completedAt) : null,
    a.rejectionReason || null, a.withdrawalReason || null, a.notes || null, T(a.applied), T(a.updatedAt), programs[S[a.sk].program].id]));
ins('application_db', 'application_timeline', ['id', 'application_id', 'from_status', 'to_status', 'comment', 'changed_by_user_id', 'created_at'], timelineRows);
ins('application_db', 'interviews', ['id', 'application_id', 'scheduled_at', 'duration_minutes', 'interview_type', 'location', 'meeting_link', 'status', 'interviewer_id', 'interviewer_notes', 'student_feedback', 'score', 'company_resolution', 'resolution_comment', 'reminder_sent', 'created_at', 'updated_at'], interviewRows);

// Prueba técnica solicitada (pendiente de entrega) para un postulante en entrevista
{
  const a = apps.find((x) => x.pk === 'P_ASISTENTE' && x.sk === 'S14');
  if (a) {
    const at = atTime(addDays(a.applied, 5), '10:00');
    selDocRows.push([uid(`sel:${a.id}`), a.id, 'Prueba técnica — Diseño de un flujo conversacional', 'Diseña el flujo conversacional para resolver tres consultas frecuentes de clientes (estado de solicitud, requisitos y reclamos) e indica cuándo escalarías a un agente humano. Entrega un documento de máximo 3 páginas.', true, P.P_ASISTENTE.company.userId, 'requested', null, null, null, null, null, T(at), T(at)]);
  }
}
ins('application_db', 'selection_document_requests', ['id', 'application_id', 'name', 'description', 'is_mandatory', 'requested_by', 'status', 'file_id', 'submitted_at', 'reviewer_id', 'reviewer_comment', 'reviewed_at', 'created_at', 'updated_at'], selDocRows);

// Admin: periodo 2025-2 + asignaciones
ins('admin_db', 'academic_periods', ['id', 'name', 'description', 'start_date', 'end_date', 'enrollment_start', 'enrollment_end', 'status', 'is_current', 'max_projects_per_company', 'max_applications_per_student', 'created_at', 'updated_at'],
  [[periodIds['2025-2'], '2025-2', 'Período académico 2025-2', D(col('2025-07-15')), D(col('2025-12-15')), D(col('2025-06-01')), D(col('2025-07-31')), 'closed', false, 10, 5, T(col('2025-06-01 09:00')), T(col('2025-12-16 09:00'))]]);
ins('admin_db', 'supervisor_assignments', ['id', 'supervisor_id', 'student_id', 'project_id', 'application_id', 'period_id', 'assigned_by', 'role', 'start_date', 'end_date', 'status', 'accepted_at', 'notes', 'created_at', 'program_id'], asg);
ins('admin_db', 'supervisor_assignment_history', ['id', 'assignment_id', 'action', 'previous_supervisor_id', 'new_supervisor_id', 'reason', 'performed_by', 'created_at'], asgHistory);

// Application: flujo académico
ins('application_db', 'project_academic_records', ['id', 'application_id', 'supervisor_assignment_id', 'anteproyecto_submission_id', 'initiation_agreement_file_id', 'official_start_date', 'agreed_duration_weeks', 'expected_end_date', 'actual_end_date', 'final_grade_file_id', 'final_grade_value', 'status', 'asesor_completion_signal', 'progress_alert_sent', 'created_at', 'updated_at'], records);
ins('application_db', 'academic_submissions', ['id', 'application_id', 'submission_type', 'status', 'current_file_id', 'version_number', 'correction_count', 'jurado_votes', 'reviewer_comments', 'asesor_comments', 'student_response', 'deadline_for_review', 'deadline_for_student', 'reviewed_at', 'submitted_at', 'created_at', 'updated_at'], submissions);
ins('application_db', 'submission_history', ['id', 'submission_id', 'action', 'actor_id', 'actor_role', 'comment', 'file_id', 'version_number', 'created_at'], subHistory);
ins('application_db', 'project_document_requirements', ['id', 'application_id', 'document_requirement_id', 'added_by', 'created_at'], docReqRows);
ins('application_db', 'final_document_requirements', ['id', 'application_id', 'name', 'description', 'actor_type', 'is_mandatory', 'display_order', 'created_by', 'created_at'], finalReqRows);
ins('application_db', 'project_documents', ['id', 'application_id', 'requirement_id', 'requirement_name', 'stage', 'actor_type', 'submitted_by', 'file_id', 'status', 'reviewer_id', 'reviewer_comment', 'submitted_at', 'reviewed_at', 'created_at', 'updated_at'], docRows);
ins('application_db', 'student_deliverables', ['id', 'application_id', 'project_deliverable_id', 'title', 'description', 'type', 'due_date', 'created_by_user_id', 'requester_type', 'assigned_at', 'file_url', 'file_type', 'submitted_at', 'status', 'feedback', 'grade', 'reviewed_by', 'reviewed_by_role', 'reviewed_at', 'revision_number', 'created_at', 'updated_at'], deliverablesRows);
ins('application_db', 'deliverable_attachments', ['id', 'deliverable_id', 'file_url', 'file_name', 'file_size_bytes', 'mime_type', 'uploaded_by_user_id', 'uploaded_at'], attachRows);
ins('application_db', 'deliverable_comments', ['id', 'deliverable_id', 'parent_id', 'author_id', 'author_role', 'content', 'is_internal', 'created_at', 'updated_at', 'deleted_at'], commentRows);
ins('evaluation_db', 'evaluations', ['id', 'application_id', 'project_id', 'evaluator_id', 'evaluated_id', 'evaluation_type', 'status', 'overall_score', 'overall_comment', 'strengths', 'areas_for_improvement', 'is_anonymous', 'due_date', 'completed_at', 'created_at', 'updated_at'], evalRows);
ins('evaluation_db', 'evaluation_ratings', ['id', 'evaluation_id', 'criterion_id', 'score', 'comment', 'created_at'], ratingRows);
ins('storage_db', 'files', ['id', 'owner_id', 'original_name', 'stored_name', 'mime_type', 'file_size_bytes', 'category', 'entity_type', 'entity_id', 'storage_path', 'status', 'is_public', 'created_at', 'updated_at'], fileRows);

// ═════════════════════════════ 6. SALIDA ═════════════════════════════
const header = [
  '-- Generado por generate-seed-showcase.mjs — NO editar a mano (regenerar con el script).',
  `-- Cohorte "showcase" para demos/sustentación · escenario anclado al ${TODAY_STR}.`,
  '-- ADITIVO e IDEMPOTENTE: UUIDs determinísticos + ON CONFLICT DO NOTHING. No toca el seed base.',
  "SET client_encoding = 'UTF8';",
];
const chunks = [...header];
for (const db of DB_ORDER) {
  if (db === 'application_db') raw.application_db.push(...ivPatches);
  if (db === 'admin_db') raw.admin_db.push(...asgPatches);
  const stmts = flush(db);
  if (!stmts.length) continue;
  chunks.push(`\n\\c ${db};`, "SET client_encoding = 'UTF8';", ...stmts);
}
// Rellena `completed_at`/`reviewed_at` ya vienen explícitos; sin UPDATE finales necesarios.
fs.writeFileSync(OUT, chunks.join('\n') + '\n', 'utf8');

// Archivos físicos
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
for (const f of physical) fs.writeFileSync(path.join(UPLOAD_DIR, f.storedName), f.buffer);

const count = (arr) => arr.length;
console.log('\nResumen:');
console.log(`  empresas=${companies.length} estudiantes=${students.length} proyectos=${projects.length} postulaciones=${count(apps)} hilos=${threads.length}`);
console.log(`  asignaciones=${count(asg)} entregables=${count(deliverablesRows)} documentos=${count(docRows)} evaluaciones=${count(evalRows)} calificaciones=${count(ratingRows)} archivos=${count(physical)}`);
console.log(`SQL escrito en ${OUT}`);
console.log(`Archivos escritos en ${UPLOAD_DIR}${STORAGE_PREFIX ? ` (storage_path → ${STORAGE_PREFIX})` : ''}`);
