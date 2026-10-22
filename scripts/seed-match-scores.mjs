#!/usr/bin/env node
/**
 * Calcula los match score de TODAS las postulaciones existentes con el algoritmo real de
 * matching-service y los guarda en `applications.match_score`.
 *
 * Por qué hace falta: el seed inserta postulaciones directamente en la BD, sin pasar por
 * application-service, que es quien calcula el score al postular. Sin esto, la columna
 * "Match" de la asignación de asesores, los filtros por match y el KPI "Match IA promedio"
 * (que sale de match_results) quedan vacíos.
 *
 * Qué hace:
 *   1. Lee (id, student_id, project_id) de application_db.applications.
 *   2. Llama a POST /internal/matching/calculate-for-application dentro del contenedor de
 *      matching-service (el endpoint es interno: no se publica al host). Eso también
 *      guarda match_results y las recomendaciones, igual que al postular desde la app.
 *   3. Actualiza applications.match_score con el resultado.
 *   4. Calcula además TODOS los cruces estudiante x proyecto publicado vigente, para que la
 *      página de recomendaciones (Smart Matching) de cada estudiante sembrado tenga contenido.
 *      matching-service guarda las recomendaciones al calcular cada par; nada lo dispara al
 *      registrarse, así que sin esto un estudiante sembrado vería la página vacía.
 *
 * Es idempotente: recalcula y solo escribe las filas cuyo valor cambia.
 *
 * Uso:
 *   node seed-match-scores.mjs [--container collab-u-postgres] [--matching collab-u-matching-service]
 */
import { execFileSync } from 'node:child_process';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const PG = arg('--container', 'collab-u-postgres');
const MATCHING = arg('--matching', 'collab-u-matching-service');
const DB_USER = 'collabu_admin';
const MATCHING_PORT = arg('--matching-port', '3007');

const env = { ...process.env, MSYS_NO_PATHCONV: '1', MSYS2_ARG_CONV_EXCL: '*' };

function psql(sql, { db = 'application_db', tuples = true } = {}) {
  const args = ['exec', '-i', '-e', 'PGCLIENTENCODING=UTF8', PG, 'psql', '-U', DB_USER, '-d', db, '-v', 'ON_ERROR_STOP=1', '-q'];
  if (tuples) args.push('-At', '-F', '|');
  return execFileSync('docker', args, { input: sql, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
}

const rows = psql('SELECT id, student_id, project_id FROM applications ORDER BY created_at;')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [id, studentId, projectId] = l.split('|');
    return { id, studentId, projectId };
  });

// Cruces estudiante x proyecto publicado vigente (sin id de postulación: solo alimentan recomendaciones).
const studentUsers = psql('SELECT user_id FROM student_profiles;', { db: 'student_db' }).split('\n').filter(Boolean);
const openProjects = psql("SELECT id FROM projects WHERE status = 'published' AND is_active = true;", { db: 'project_db' }).split('\n').filter(Boolean);
const known = new Set(rows.map((r) => `${r.studentId}|${r.projectId}`));
const extra = [];
for (const studentId of studentUsers) for (const projectId of openProjects) if (!known.has(`${studentId}|${projectId}`)) extra.push({ id: null, studentId, projectId });
const pairs = [...rows, ...extra];

if (pairs.length === 0) {
  console.log('No hay postulaciones ni cruces: nada que calcular.');
  process.exit(0);
}

// Se ejecuta DENTRO del contenedor de matching-service (Node 18+ trae fetch).
const remote = `
let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', async () => {
  const pairs = JSON.parse(raw);
  const out = [];
  for (const p of pairs) {
    try {
      const r = await fetch('http://localhost:${MATCHING_PORT}/internal/matching/calculate-for-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: p.studentId, projectId: p.projectId }),
      });
      const j = await r.json().catch(() => ({}));
      out.push({ id: p.id, score: r.ok && typeof j.score === 'number' ? j.score : null, status: r.status });
    } catch (e) {
      out.push({ id: p.id, score: null, status: 0, error: String(e && e.message || e) });
    }
  }
  process.stdout.write(JSON.stringify(out));
});
`;

console.log(`Calculando match score de ${rows.length} postulaciones y ${extra.length} cruces estudiante-proyecto con matching-service...`);
let results;
try {
  // matching-service dockerizado → se ejecuta dentro de su contenedor; si corre en el host (desarrollo local con
  // `npm run start`), el endpoint interno es alcanzable en 127.0.0.1 y se ejecuta con el Node local.
  let dockerized = false;
  try { dockerized = execFileSync('docker', ['inspect', '-f', '{{.State.Running}}', MATCHING], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true'; } catch { /* sin contenedor */ }
  const [cmd, cmdArgs] = dockerized ? ['docker', ['exec', '-i', MATCHING, 'node', '-e', remote]] : ['node', ['-e', remote.replace('http://localhost:', 'http://127.0.0.1:')]];
  if (!dockerized) console.log('  matching-service no está dockerizado: se usa el servicio local (127.0.0.1).');
  const stdout = execFileSync(cmd, cmdArgs, {
    input: JSON.stringify(pairs),
    encoding: 'utf8',
    env,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
  });
  results = JSON.parse(stdout);
} catch (e) {
  console.error(`No se pudo llamar a matching-service (${MATCHING}): ${e.message}`);
  process.exit(1);
}

const ok = results.filter((r) => r.score !== null && r.id);
const okExtra = results.filter((r) => r.score !== null && !r.id).length;
const failed = results.filter((r) => r.score === null);
if (failed.length) {
  console.warn(`  ${failed.length} postulaciones sin score (matching-service respondió ${[...new Set(failed.map((f) => f.status))].join('/')}).`);
}

if (ok.length > 0) {
  const values = ok.map((r) => `('${r.id}'::uuid, ${Number(r.score).toFixed(2)})`).join(',\n');
  psql(
    `UPDATE applications a SET match_score = v.score, updated_at = a.updated_at
       FROM (VALUES ${values}) AS v(id, score)
      WHERE a.id = v.id AND a.match_score IS DISTINCT FROM v.score;`,
  );
}

const scores = ok.map((r) => r.score);
const avg = scores.length ? scores.reduce((t, s) => t + s, 0) / scores.length : 0;
console.log(`  match score guardado en ${ok.length} postulaciones (promedio ${avg.toFixed(1)}, mín ${Math.min(...scores)}, máx ${Math.max(...scores)}) y ${okExtra} cruces para recomendaciones.`);

// match_results es una caché recalculable. Se conservan solo las postulaciones y los cruces que
// generaron recomendación (score >= umbral); los pares sin afinidad se descartan para que el KPI
// "Match IA promedio" refleje postulaciones y recomendaciones reales y no el cruce de todos con todos.
const keep = rows.map((r) => `('${r.studentId}','${r.projectId}')`).join(',');
if (extra.length > 0) {
  const removed = psql(
    `WITH del AS (
       DELETE FROM match_results mr
        WHERE NOT EXISTS (SELECT 1 FROM match_recommendations r WHERE r.match_result_id = mr.id)
          ${rows.length ? `AND (mr.student_id, mr.project_id) NOT IN (VALUES ${keep})` : ''}
       RETURNING 1)
     SELECT count(*) FROM del;`,
    { db: 'matching_db' },
  ).trim();
  console.log(`  ${removed} cruces sin afinidad descartados de la caché (no generan recomendación).`);
}
