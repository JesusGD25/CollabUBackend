#!/usr/bin/env node
/**
 * VERIFICACIÓN RÁPIDA ANTES DE PRESENTAR (≈ 20 s): comprueba por el gateway, con las cuentas reales de la demo,
 * que cada guion (GUION_DEMO_20_MINUTOS.md) tiene los datos que necesita. Sale con código 1 si algo falla.
 *
 * Uso: node demo-check.mjs [--gateway http://127.0.0.1:3000]
 */
const GATEWAY = (process.argv.includes('--gateway') ? process.argv[process.argv.indexOf('--gateway') + 1] : 'http://127.0.0.1:3000').replace(/\/+$/, '');
const PASSWORD = 'CollabU2026!';
const results = [];
const check = (ok, label, detail = '') => { results.push(ok); console.log(`${ok ? '✔' : '✘'} ${label}${detail ? ` — ${detail}` : ''}`); };

async function call(method, url, token, body) {
  const res = await fetch(`${GATEWAY}/api/v1${url}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}
async function login(email) {
  const r = await call('POST', '/auth/login', null, { email, password: PASSWORD });
  check(r.status === 200, `login ${email}`);
  return r.data?.accessToken;
}

try {
  // 1. Estudiante SIN proyecto
  let t = await login('tatiana.mesa@collabu.dev');
  let r = await call('GET', '/matching/recommendations?limit=10', t);
  const recs = r.data?.data || [];
  check(recs.length >= 3, 'Tatiana: recomendaciones de Smart Matching', `${recs.length} (mejor: ${recs[0]?.projectTitle} ${recs[0]?.matchResult?.overallScore}%)`);
  r = await call('GET', '/applications/my?limit=20', t);
  const apps = r.data?.data || r.data || [];
  check(Array.isArray(apps) && apps.length === 0, 'Tatiana: sin postulaciones (estado inicial de la demo)', `${apps.length} postulaciones`);

  // 2. Estudiante con proyecto EN DESARROLLO
  t = await login('miguel.zambrano@collabu.dev');
  r = await call('GET', '/applications/a534634a-9e66-46f0-a9a8-57fcd629da87/context', t);
  check(r.status === 200 && r.data?.application?.status === 'in_progress', 'Miguel: proyecto en desarrollo', r.data?.application?.status);

  // 3. Estudiante con proyecto FINALIZADO
  t = await login('valentina.guerrero@collabu.dev');
  r = await call('GET', '/applications/511fe722-63f5-4216-a3f8-2d1c165cd304/context', t);
  check(r.status === 200 && r.data?.application?.status === 'completed', 'Valentina: proyecto finalizado', r.data?.application?.status);

  // 4. Docente con asignaciones pendientes
  t = await login('faculty03@collabu.dev');
  r = await call('GET', '/admin/supervisors/my-students?enriched=true&limit=100', t);
  const rows = r.data?.data || r.data || [];
  const pend = rows.filter((x) => x.status === 'pending_acceptance');
  check(pend.length >= 1, 'Marta Ríos: asignación pendiente de aceptar (la demo acepta una)', `${pend.length}`);

  // 5. Admin de departamento (Sistemas)
  t = await login('admin.sistemas@collabu.dev');
  r = await call('GET', '/applications/admin/pending?page=1&limit=20', t);
  check((r.data?.total ?? 0) >= 1, 'Admin Sistemas: cola de asesores con pendientes', `${r.data?.total}`);
  r = await call('GET', '/companies/admin/list?status=pending&limit=50', t);
  check((r.data?.data || []).length >= 1, 'Admin Sistemas: empresas pendientes de verificar', (r.data?.data || []).map((c) => c.companyName).join(', '));
  r = await call('GET', '/auth/admin/users', t);
  check(r.status === 403, 'Admin Sistemas: NO accede a la gestión de usuarios (solo superadmin)', `HTTP ${r.status}`);

  // 6. Superadmin
  t = await login('admin01@collabu.dev');
  r = await call('GET', '/companies/admin/list?status=pending&limit=50', t);
  check((r.data?.data || []).length >= 3, 'Superadmin: empresas pendientes de varios departamentos', `${(r.data?.data || []).length}`);
  r = await call('GET', '/analytics/skills/trends?limit=5&sort=gap', t);
  check(Array.isArray(r.data) && r.data.length >= 3, 'Superadmin: oferta vs demanda de habilidades', (r.data || []).slice(0, 3).map((x) => x.skillName).join(', '));
} catch (e) {
  check(false, 'Error inesperado', e.message);
}

const failed = results.filter((x) => !x).length;
console.log(failed ? `\n${failed} comprobaciones fallaron: no presentes sin revisarlas.` : '\nTodo listo para la demostración ✔');
process.exit(failed ? 1 : 0);
