#!/usr/bin/env node
/**
 * Dispara la agregación de analítica del seed (por departamento): backfill mensual + semanal,
 * agregación diaria y snapshot "de ayer" de skills. analytics_db NUNCA se llena por INSERT directo:
 * esto usa el servicio real, que guarda una fila por (fecha, departamento) más la de Facultad.
 *
 * Requiere gateway (3000) y analytics-service corriendo.
 * Uso: node seed-analytics.mjs [--gateway http://127.0.0.1:3000] [--container collab-u-postgres]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const GATEWAY = arg('--gateway', 'http://127.0.0.1:3000').replace(/\/+$/, '').replace('//localhost', '//127.0.0.1');
const CONTAINER = arg('--container', 'collab-u-postgres');
const call = async (method, url, body, token) => {
  const res = await fetch(`${GATEWAY}${url}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${text.slice(0, 160)}`);
  return text ? JSON.parse(text) : null;
};

const login = await call('POST', '/api/v1/auth/login', { email: 'admin01@collabu.dev', password: 'CollabU2026!' });
const token = login.accessToken;

// Backfill: primer día de cada mes desde 2025-06 + últimas 6 semanas.
const dates = [];
const now = new Date();
for (let c = new Date(2025, 5, 1); c < new Date(now.getFullYear(), now.getMonth(), 1); c.setMonth(c.getMonth() + 1)) {
  dates.push(`${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-01`);
}
for (let k = 6; k >= 1; k--) { const d = new Date(now.getTime() - k * 7 * 864e5); dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); }
const hist = await call('POST', '/api/v1/analytics/aggregate/run-historical', { dates }, token);
console.log(`backfill histórico: ${hist?.written ?? '?'} snapshots`);
await call('POST', '/api/v1/analytics/aggregate/run', null, token);
console.log('agregación diaria ejecutada');

// La tendencia de skills compara contra el snapshot de ayer: se crea uno mínimo para la demo.
const sqlFile = path.join(scriptDir, 'seed_skill_trends_history.sql');
if (fs.existsSync(sqlFile)) {
  execFileSync('docker', ['exec', '-i', '-e', 'PGCLIENTENCODING=UTF8', CONTAINER, 'psql', '-U', 'collabu_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'], { input: fs.readFileSync(sqlFile, 'utf8'), encoding: 'utf-8' });
  console.log('tendencias de skills con historial mínimo');
}
