#!/usr/bin/env node
/**
 * FASE 5 del PLANNING_ANALYTICS_SERVICE.md — genera Backend/scripts/seed_analytics_historical.sql:
 * una cohorte histórica INDEPENDIENTE (nuevos estudiantes/empresas/proyectos/aplicaciones) que NO
 * toca ninguna fila de seed_full_up.sql (28 usuarios, 19 proyectos, 9 pares de matching protegidos).
 *
 * Principios aplicados (ver §9 del planning):
 *  - Datos fuente reales con fechas históricas (2025-10 a 2026-08, antes del ancla 2026-08-12 del
 *    seed principal) — analytics_db NUNCA se puebla con INSERT directo; se agrega ejecutando el
 *    agregador real de analytics-service después de cargar estos datos (ver Run-Seed-Analytics-Historical.ps1).
 *  - Usa catalogSkillId/programId REALES (leídos en vivo de admin_db, sembrados en runtime por
 *    admin-service) — no inventa catálogos paralelos.
 *  - Todo timestamp que la app usaría para calcular duraciones (created_at, applied_at, accepted_at,
 *    application_timeline.created_at) se fija EXPLÍCITAMENTE a una fecha histórica — nunca se deja
 *    caer en el default NOW() del INSERT (esa fue la causa raíz del bug de -3555.96h ya corregido
 *    en supervisor_assignments; no se repite aquí).
 *
 * Uso:
 *   node generate-seed-analytics-historical.mjs
 * Requiere el contenedor Postgres corriendo (para leer catalogSkillId/programId reales).
 */

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTAINER = process.env.POSTGRES_CONTAINER || 'collab-u-postgres';
const PGUSER = process.env.POSTGRES_USER || 'collabu_admin';

function psql(db, sql) {
  const args = ['exec', '-i', CONTAINER, 'psql', '-U', PGUSER, '-d', db, '-t', '-A', '-c', sql];
  const out = execFileSync('docker', args, { encoding: 'utf-8' });
  return out.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.length > 0);
}

function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

// ─── 1. Leer catálogo real (skillId/programId) de admin_db ────────────────────────────────────

const skillRows = psql(
  'admin_db',
  "SELECT id || '|' || name FROM skill_catalog WHERE name IN ('react','python','sql','javascript','node','postgresql','java','machine learning','devops','angular','typescript','docker','figma')",
);
const SKILL = {};
for (const row of skillRows) {
  const [id, name] = row.split('|');
  SKILL[name] = id;
}
const REQUIRED_SKILLS = ['react', 'python', 'sql', 'javascript', 'node', 'postgresql', 'java', 'machine learning', 'devops', 'angular', 'typescript', 'docker', 'figma'];
for (const s of REQUIRED_SKILLS) {
  if (!SKILL[s]) throw new Error(`Skill "${s}" no encontrada en skill_catalog — ¿admin-service corrió su seed runtime?`);
}

const programRows = psql('admin_db', "SELECT id || '|' || name FROM academic_programs");
const PROGRAM = {};
for (const row of programRows) {
  const [id, name] = row.split('|');
  PROGRAM[name] = id;
}
for (const p of ['Ingeniería de Sistemas', 'Ingeniería Electrónica', 'Ingeniería Civil']) {
  if (!PROGRAM[p]) throw new Error(`Programa "${p}" no encontrado en academic_programs`);
}

const [PASSWORD_HASH] = psql('auth_db', 'SELECT password_hash FROM users LIMIT 1');
if (!PASSWORD_HASH) throw new Error('No se pudo leer un password_hash existente de auth_db.users');

console.log(`Catálogo leído: ${Object.keys(SKILL).length} skills, ${Object.keys(PROGRAM).length} programas.`);

// ─── 2. Definir la cohorte histórica ────────────────────────────────────────────────────────────

const uid = () => randomUUID();

const companies = [
  { id: uid(), userId: uid(), name: 'DataWave Analytics', industry: 'Tecnología', size: 'small', createdAt: '2025-09-15 09:00:00-05', email: 'datawave.hist@collabu.dev' },
  { id: uid(), userId: uid(), name: 'Andes Robotics', industry: 'Manufactura', size: 'medium', createdAt: '2025-09-15 09:30:00-05', email: 'andesrobotics.hist@collabu.dev' },
];

const students = [
  { id: uid(), userId: uid(), first: 'Camila', last: 'Ortega', program: 'Ingeniería de Sistemas', semester: 6, createdAt: '2025-10-05 08:00:00-05', email: 'h.student01@collabu.dev', skills: ['react', 'javascript', 'sql'] },
  { id: uid(), userId: uid(), first: 'Julián', last: 'Restrepo', program: 'Ingeniería Electrónica', semester: 7, createdAt: '2025-10-08 08:00:00-05', email: 'h.student02@collabu.dev', skills: ['python', 'devops'] },
  { id: uid(), userId: uid(), first: 'Valentina', last: 'Suárez', program: 'Ingeniería de Sistemas', semester: 5, createdAt: '2025-11-04 08:00:00-05', email: 'h.student03@collabu.dev', skills: ['python', 'sql', 'machine learning'] },
  { id: uid(), userId: uid(), first: 'Andrés', last: 'Muñoz', program: 'Ingeniería Civil', semester: 8, createdAt: '2025-12-02 08:00:00-05', email: 'h.student04@collabu.dev', skills: ['figma', 'sql'] },
  { id: uid(), userId: uid(), first: 'Laura', last: 'Cifuentes', program: 'Ingeniería de Sistemas', semester: 4, createdAt: '2025-12-10 08:00:00-05', email: 'h.student05@collabu.dev', skills: ['javascript', 'react', 'typescript'] },
  { id: uid(), userId: uid(), first: 'Santiago', last: 'Vargas', program: 'Ingeniería de Sistemas', semester: 7, createdAt: '2026-01-15 08:00:00-05', email: 'h.student06@collabu.dev', skills: ['node', 'postgresql', 'docker'] },
  { id: uid(), userId: uid(), first: 'Mariana', last: 'Herrera', program: 'Ingeniería Electrónica', semester: 6, createdAt: '2026-02-12 08:00:00-05', email: 'h.student07@collabu.dev', skills: ['python', 'devops', 'docker'] },
  { id: uid(), userId: uid(), first: 'Felipe', last: 'Castaño', program: 'Ingeniería de Sistemas', semester: 5, createdAt: '2026-03-10 08:00:00-05', email: 'h.student08@collabu.dev', skills: ['java', 'sql'] },
];
const S = Object.fromEntries(students.map((s, i) => [`S${i + 1}`, s]));
const C = Object.fromEntries(companies.map((c, i) => [`C${i + 1}`, c]));

// projectType: internship | professional_practice | thesis | research | other
const projects = [
  { key: 'P1', company: 'C1', title: 'Plataforma de Analítica de Ventas', type: 'professional_practice', createdAt: '2025-10-12 09:00:00-05', status: 'completed', skills: ['react', 'sql', 'python'] },
  { key: 'P2', company: 'C2', title: 'Sistema de Control PLC', type: 'internship', createdAt: '2025-10-18 09:00:00-05', status: 'cancelled', skills: ['python', 'devops'] },
  { key: 'P3', company: 'C1', title: 'Dashboard de KPIs Internos', type: 'professional_practice', createdAt: '2025-11-10 09:00:00-05', status: 'completed', skills: ['react', 'typescript', 'sql'] },
  { key: 'P4', company: 'C2', title: 'Optimización de Firmware IoT', type: 'thesis', createdAt: '2025-12-05 09:00:00-05', status: 'in_progress', skills: ['python', 'devops'] },
  { key: 'P5', company: 'C1', title: 'Automatización de Reportes Financieros', type: 'professional_practice', createdAt: '2026-01-08 09:00:00-05', status: 'needs_changes', skills: ['python', 'sql'] },
  { key: 'P6', company: 'C2', title: 'App Móvil de Mantenimiento Predictivo', type: 'professional_practice', createdAt: '2026-02-05 09:00:00-05', status: 'in_progress', skills: ['react', 'machine learning'] },
  { key: 'P7', company: 'C1', title: 'Migración a Arquitectura de Microservicios', type: 'thesis', createdAt: '2026-03-10 09:00:00-05', status: 'completed', skills: ['node', 'docker', 'postgresql'] },
  { key: 'P8', company: 'C2', title: 'Gemelo Digital de Línea de Producción', type: 'research', createdAt: '2026-03-20 09:00:00-05', status: 'draft', skills: ['python', 'machine learning'] },
  { key: 'P9', company: 'C1', title: 'Bot de Soporte Interno con IA', type: 'professional_practice', createdAt: '2026-04-10 09:00:00-05', status: 'in_progress', skills: ['python', 'machine learning', 'sql'] },
  { key: 'P10', company: 'C2', title: 'Sensorización de Planta con IoT', type: 'internship', createdAt: '2026-05-10 09:00:00-05', status: 'in_progress', skills: ['devops', 'docker'] },
  { key: 'P11', company: 'C1', title: 'Rediseño de UX del Portal de Clientes', type: 'professional_practice', createdAt: '2026-06-10 09:00:00-05', status: 'published', skills: ['figma', 'react'] },
  { key: 'P12', company: 'C2', title: 'Plataforma de Trazabilidad de Inventario', type: 'professional_practice', createdAt: '2026-07-08 09:00:00-05', status: 'pending_approval', skills: ['java', 'sql'] },
  { key: 'P13', company: 'C1', title: 'Motor de Recomendaciones de Productos', type: 'professional_practice', createdAt: '2026-08-01 09:00:00-05', status: 'draft', skills: ['python', 'sql'] },
  { key: 'P14', company: 'C2', title: 'Panel de Control Remoto de Robots', type: 'professional_practice', createdAt: '2026-08-01 09:30:00-05', status: 'published', skills: ['typescript', 'react'] },
];
const P = Object.fromEntries(projects.map((p) => [p.key, { ...p, id: uid() }]));

// status: pending|under_review|shortlisted|interview|accepted|pending_supervisor|rejected|withdrawn|in_progress|completed|cancelled
// Cada aplicación: fromStatus/toStatus en application_timeline con created_at explícito por cada salto.
const applications = [
  { project: 'P1', student: 'S1', appliedAt: '2025-10-20 10:00:00-05', steps: [['pending', 'accepted', '2025-10-22 10:00:00-05'], ['accepted', 'in_progress', '2025-10-24 10:00:00-05'], ['in_progress', 'completed', '2026-03-15 10:00:00-05']] },
  { project: 'P1', student: 'S2', appliedAt: '2025-10-19 10:00:00-05', steps: [['pending', 'rejected', '2025-10-21 10:00:00-05']] },
  { project: 'P2', student: 'S1', appliedAt: '2025-11-05 10:00:00-05', steps: [['pending', 'withdrawn', '2025-12-05 10:00:00-05']] },
  { project: 'P3', student: 'S1', appliedAt: '2025-11-15 10:00:00-05', steps: [['pending', 'accepted', '2025-11-18 10:00:00-05'], ['accepted', 'in_progress', '2025-11-20 10:00:00-05'], ['in_progress', 'completed', '2026-04-01 10:00:00-05']] },
  { project: 'P3', student: 'S3', appliedAt: '2025-11-14 10:00:00-05', steps: [['pending', 'rejected', '2025-11-16 10:00:00-05']] },
  { project: 'P4', student: 'S4', appliedAt: '2025-12-12 10:00:00-05', steps: [['pending', 'accepted', '2025-12-15 10:00:00-05'], ['accepted', 'in_progress', '2025-12-17 10:00:00-05']] },
  { project: 'P4', student: 'S5', appliedAt: '2025-12-13 10:00:00-05', steps: [['pending', 'rejected', '2025-12-16 10:00:00-05']] },
  { project: 'P6', student: 'S6', appliedAt: '2026-02-10 10:00:00-05', steps: [['pending', 'accepted', '2026-02-14 10:00:00-05'], ['accepted', 'in_progress', '2026-02-16 10:00:00-05']] },
  { project: 'P6', student: 'S7', appliedAt: '2026-02-14 10:00:00-05', steps: [['pending', 'rejected', '2026-02-17 10:00:00-05']] },
  { project: 'P7', student: 'S2', appliedAt: '2026-03-16 10:00:00-05', steps: [['pending', 'accepted', '2026-03-19 10:00:00-05'], ['accepted', 'in_progress', '2026-03-21 10:00:00-05'], ['in_progress', 'completed', '2026-08-15 10:00:00-05']] },
  { project: 'P7', student: 'S8', appliedAt: '2026-03-17 10:00:00-05', steps: [['pending', 'rejected', '2026-03-19 10:00:00-05']] },
  { project: 'P9', student: 'S3', appliedAt: '2026-04-12 10:00:00-05', steps: [['pending', 'accepted', '2026-04-16 10:00:00-05'], ['accepted', 'in_progress', '2026-04-18 10:00:00-05']] },
  { project: 'P9', student: 'S5', appliedAt: '2026-04-13 10:00:00-05', steps: [['pending', 'rejected', '2026-04-17 10:00:00-05']] },
  { project: 'P9', student: 'S6', appliedAt: '2026-04-14 10:00:00-05', steps: [['pending', 'rejected', '2026-04-17 10:00:00-05']] },
  { project: 'P10', student: 'S7', appliedAt: '2026-05-12 10:00:00-05', steps: [['pending', 'accepted', '2026-05-16 10:00:00-05'], ['accepted', 'in_progress', '2026-05-18 10:00:00-05']] },
  { project: 'P11', student: 'S4', appliedAt: '2026-06-14 10:00:00-05', steps: [['pending', 'withdrawn', '2026-06-20 10:00:00-05']] },
  { project: 'P14', student: 'S1', appliedAt: '2026-08-10 10:00:00-05', steps: [] },
  { project: 'P14', student: 'S8', appliedAt: '2026-08-12 10:00:00-05', steps: [['pending', 'under_review', '2026-08-13 10:00:00-05']] },
];

// ─── 3. Generar SQL ──────────────────────────────────────────────────────────────────────────

const lines = [];
lines.push('-- Generado por generate-seed-analytics-historical.mjs — FASE 5 del PLANNING_ANALYTICS_SERVICE.md');
lines.push('-- Cohorte histórica independiente (2025-10 a 2026-08) para analítica — NO modifica seed_full_up.sql.');
lines.push('-- Idempotente: usa ON CONFLICT DO NOTHING con UUIDs fijos generados una sola vez en este archivo.');
lines.push('');

// auth_db: usuarios (empresas + estudiantes)
lines.push('\\c auth_db;');
lines.push('SET client_encoding = \'UTF8\';');
lines.push('INSERT INTO "users" (id, email, password_hash, role, is_verified, is_active, created_at) VALUES');
const userRows = [
  ...companies.map((c) => `(${esc(c.userId)}, ${esc(c.email)}, ${esc(PASSWORD_HASH)}, 'company', true, true, ${esc(c.createdAt)})`),
  ...students.map((s) => `(${esc(s.userId)}, ${esc(s.email)}, ${esc(PASSWORD_HASH)}, 'student', true, true, ${esc(s.createdAt)})`),
];
lines.push(userRows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;');
lines.push('');

// user_db: perfiles
lines.push('\\c user_db;');
lines.push('SET client_encoding = \'UTF8\';');
lines.push('INSERT INTO "user_profiles" (id, user_id, role, first_name, last_name, country, created_at) VALUES');
const profileRows = [
  ...companies.map((c) => `(${esc(uid())}, ${esc(c.userId)}, 'company', ${esc(c.name)}, '', 'Colombia', ${esc(c.createdAt)})`),
  ...students.map((s) => `(${esc(uid())}, ${esc(s.userId)}, 'student', ${esc(s.first)}, ${esc(s.last)}, 'Colombia', ${esc(s.createdAt)})`),
];
lines.push(profileRows.join(',\n') + '\nON CONFLICT (user_id) DO NOTHING;');
lines.push('');

// company_db
lines.push('\\c company_db;');
lines.push('SET client_encoding = \'UTF8\';');
lines.push('INSERT INTO "companies" (id, user_id, company_name, industry, company_size, verification_status, is_active, created_at) VALUES');
lines.push(
  companies
    .map((c) => `(${esc(c.id)}, ${esc(c.userId)}, ${esc(c.name)}, ${esc(c.industry)}, ${esc(c.size)}, 'verified', true, ${esc(c.createdAt)})`)
    .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
);
lines.push('');

// student_db: perfiles + skills
lines.push('\\c student_db;');
lines.push('SET client_encoding = \'UTF8\';');
lines.push('INSERT INTO "student_profiles" (id, user_id, program, program_id, semester, availability, profile_completeness, is_visible, created_at) VALUES');
lines.push(
  students
    .map((s) => `(${esc(s.id)}, ${esc(s.userId)}, ${esc(s.program)}, ${esc(PROGRAM[s.program])}, ${s.semester}, 'flexible', 70, true, ${esc(s.createdAt)})`)
    .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
);
lines.push('');
lines.push('INSERT INTO "skills" (id, student_id, name, catalog_skill_id, category, proficiency_level, created_at) VALUES');
const skillCategory = { react: 'framework', angular: 'framework', python: 'language', sql: 'language', javascript: 'language', typescript: 'language', java: 'language', node: 'framework', postgresql: 'tool', docker: 'tool', figma: 'tool', devops: 'concept', 'machine learning': 'concept' };
const studentSkillRows = [];
for (const s of students) {
  for (const skillName of s.skills) {
    studentSkillRows.push(
      `(${esc(uid())}, ${esc(s.id)}, ${esc(skillName)}, ${esc(SKILL[skillName])}, ${esc(skillCategory[skillName])}, 'intermediate', ${esc(s.createdAt)})`,
    );
  }
}
lines.push(studentSkillRows.join(',\n') + '\nON CONFLICT (student_id, name) DO NOTHING;');
lines.push('');

// project_db: proyectos + skills
lines.push('\\c project_db;');
lines.push('SET client_encoding = \'UTF8\';');
lines.push('INSERT INTO "projects" (id, company_id, created_by_user_id, title, description, project_type, status, is_active, created_at) VALUES');
lines.push(
  Object.values(P)
    .map((p) => {
      const company = C[p.company];
      const desc = `Proyecto histórico de analítica — ${p.title}.`;
      return `(${esc(p.id)}, ${esc(company.userId)}, ${esc(company.userId)}, ${esc(p.title)}, ${esc(desc)}, ${esc(p.type)}, ${esc(p.status)}, true, ${esc(p.createdAt)})`;
    })
    .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
);
lines.push('');
lines.push('INSERT INTO "project_skills" (id, project_id, name, catalog_skill_id, category, is_mandatory, created_at) VALUES');
const projectSkillRows = [];
for (const p of Object.values(P)) {
  for (const skillName of p.skills) {
    projectSkillRows.push(
      `(${esc(uid())}, ${esc(p.id)}, ${esc(skillName)}, ${esc(SKILL[skillName])}, ${esc(skillCategory[skillName])}, true, ${esc(p.createdAt)})`,
    );
  }
}
lines.push(projectSkillRows.join(',\n') + '\nON CONFLICT (project_id, name) DO NOTHING;');
lines.push('');

// application_db: aplicaciones + timeline
lines.push('\\c application_db;');
lines.push('SET client_encoding = \'UTF8\';');
const appWithIds = applications.map((a) => ({ ...a, id: uid(), project: P[a.project], student: S[a.student] }));

lines.push('INSERT INTO "applications" (id, project_id, student_id, status, applied_at, accepted_at, completed_at, rejection_reason, withdrawal_reason, created_at) VALUES');
lines.push(
  appWithIds
    .map((a) => {
      const finalStatus = a.steps.length > 0 ? a.steps[a.steps.length - 1][1] : 'pending';
      const acceptedStep = a.steps.find(([, to]) => to === 'accepted');
      const completedStep = a.steps.find(([, to]) => to === 'completed');
      const rejectedStep = a.steps.find(([, to]) => to === 'rejected');
      const withdrawnStep = a.steps.find(([, to]) => to === 'withdrawn');
      return `(${esc(a.id)}, ${esc(a.project.id)}, ${esc(a.student.userId)}, ${esc(finalStatus)}, ${esc(a.appliedAt)}, ` +
        `${acceptedStep ? esc(acceptedStep[2]) : 'NULL'}, ${completedStep ? esc(completedStep[2]) : 'NULL'}, ` +
        `${rejectedStep ? esc('No se ajusta al perfil buscado en este momento.') : 'NULL'}, ` +
        `${withdrawnStep ? esc('El estudiante retiró su postulación.') : 'NULL'}, ${esc(a.appliedAt)})`;
    })
    .join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
);
lines.push('');

const timelineRows = [];
for (const a of appWithIds) {
  let from = 'pending';
  for (const [stepFrom, stepTo, at] of a.steps) {
    timelineRows.push(
      `(${esc(uid())}, ${esc(a.id)}, ${esc(stepFrom)}, ${esc(stepTo)}, ${esc(a.student.userId)}, ${esc(at)})`,
    );
    from = stepTo;
  }
  void from;
}
if (timelineRows.length > 0) {
  lines.push('INSERT INTO "application_timeline" (id, application_id, from_status, to_status, changed_by_user_id, created_at) VALUES');
  lines.push(timelineRows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;');
  lines.push('');
}

const outPath = join(__dirname, 'seed_analytics_historical.sql');
writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
console.log(`Escrito: ${outPath}`);
console.log(`Resumen: ${companies.length} empresas, ${students.length} estudiantes, ${Object.keys(P).length} proyectos, ${appWithIds.length} aplicaciones, ${timelineRows.length} transiciones de timeline.`);
