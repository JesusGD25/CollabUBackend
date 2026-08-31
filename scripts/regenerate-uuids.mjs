#!/usr/bin/env node
/**
 * Convierte los UUIDs pseudo-deterministas del seed (con byte de versión = 0)
 * a UUIDs v4 RFC-válidos, preservando la unicidad y las referencias
 * cruzadas entre tablas.
 *
 * Los UUIDs seed originales (ej `10000000-0000-0000-0000-000000000001`)
 * no cumplen RFC 4122 porque su byte de versión es 0; class-validator con
 * `@IsUUID()` los rechaza. Regenerarlos aquí evita relajar la validación
 * de los DTOs backend, que debe seguir estricta para producción.
 *
 * Determinismo: se aplica SHA-256 al UUID original, se toman 16 bytes y se
 * fijan los bits de versión (4) y variant (RFC 4122). Con el mismo input,
 * siempre se genera el mismo UUID v4.
 *
 * Archivos actualizados:
 *   - seed_full_up.sql
 *   - seed_full_down.sql
 *   - generate-seed-files.mjs (usa los IDs de files)
 *   - Verify-Seed.ps1        (comprueba IDs concretos)
 *
 * Uso:
 *   node regenerate-uuids.mjs           # in-place
 *   node regenerate-uuids.mjs --dry     # solo reporta cuántos IDs cambian
 *   node regenerate-uuids.mjs --print   # imprime el mapa old→new
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILES = [
  path.join(__dirname, 'seed_full_up.sql'),
  path.join(__dirname, 'seed_full_down.sql'),
  path.join(__dirname, 'generate-seed-files.mjs'),
  path.join(__dirname, 'Verify-Seed.ps1'),
  path.join(__dirname, 'seed_shift_dates.sql'),
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry');
const printMap = args.has('--print');

/** Convierte un UUID hex arbitrario (con guiones) en UUID v4 determinista. */
function toV4(hex) {
  const digest = crypto.createHash('sha256').update(hex.toLowerCase()).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
  const h = bytes.toString('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    h.slice(12, 16),
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
}

/**
 * Un UUID se considera "válido RFC" cuando el nibble de versión es 1-5.
 * Los del seed tienen versión = 0, por eso deben regenerarse.
 */
function needsRegeneration(uuid) {
  const versionChar = uuid[14];
  return !/^[1-5]$/.test(versionChar);
}

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

// ── Recolectar UUIDs únicos que necesitan cambio ─────────────────────────
const oldSet = new Set();
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(UUID_RE)) {
    const u = match[0].toLowerCase();
    if (needsRegeneration(u)) oldSet.add(u);
  }
}

// ── Construir mapa determinista old → new ────────────────────────────────
const map = new Map();
for (const old of oldSet) {
  map.set(old, toV4(old));
}

// Colisiones: extremadamente improbables con SHA-256/16 bytes, pero se
// verifica por rigurosidad.
const collisions = new Set();
const seen = new Set();
for (const v of map.values()) {
  if (seen.has(v)) collisions.add(v);
  seen.add(v);
}
if (collisions.size > 0) {
  console.error('Colisiones detectadas — abortando:', [...collisions]);
  process.exit(2);
}

console.log(`Encontrados ${map.size} UUIDs únicos a regenerar.`);

if (printMap) {
  for (const [o, n] of map) console.log(`${o} → ${n}`);
}

if (dryRun) {
  console.log('Dry run: sin cambios en disco.');
  process.exit(0);
}

// ── Aplicar reemplazos ───────────────────────────────────────────────────
let totalReplacements = 0;
for (const file of FILES) {
  if (!fs.existsSync(file)) {
    console.log(`(saltado) ${path.basename(file)} no existe`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = content.replace(UUID_RE, (m) => {
    const key = m.toLowerCase();
    return map.get(key) ?? m;
  });
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    const changes = original.match(UUID_RE)?.filter((u) => map.has(u.toLowerCase())).length ?? 0;
    console.log(`  ${path.basename(file)}: ${changes} sustituciones`);
    totalReplacements += changes;
  } else {
    console.log(`  ${path.basename(file)}: sin cambios`);
  }
}

// ── Persistir el mapa para trazabilidad ──────────────────────────────────
const mapPath = path.join(__dirname, 'uuid-map.generated.json');
fs.writeFileSync(
  mapPath,
  JSON.stringify(Object.fromEntries(map), null, 2),
  'utf8',
);
console.log(`\nMapa guardado en ${path.basename(mapPath)} (${map.size} entradas).`);
console.log(`Total sustituciones: ${totalReplacements}`);
