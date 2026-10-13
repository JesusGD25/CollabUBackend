#!/usr/bin/env node
/**
 * Genera los archivos físicos que el seed referencia y emite el SQL que corrige
 * sus rutas.
 *
 * El seed inserta filas en `files` con rutas decorativas (`academic/x.pdf`) que
 * no existen en ningún disco, así que toda descarga terminaba en
 * "Archivo físico no encontrado" aunque los permisos fueran correctos.
 *
 * La ruta real depende de la máquina — Storage Service guarda
 * `path.join(UPLOAD_DIR, storedName)` en absoluto — de modo que no puede fijarse
 * en el SQL. Este script la calcula al sembrar y la escribe en la base de datos.
 *
 * Uso:
 *   node generate-seed-files.mjs [--out <ruta-del-sql>] [--storage-prefix <dir>]
 *
 * Variables de entorno:
 *   UPLOAD_DIR  Carpeta (del host) donde se escriben los archivos generados.
 *               Por defecto: Backend/services/storage-service/uploads
 *   SEED_STORAGE_PREFIX  (o --storage-prefix) Carpeta que se guarda en
 *               `files.storage_path` si es distinta de UPLOAD_DIR. Necesaria con
 *               Docker: storage-service lee de /app/uploads DENTRO del contenedor,
 *               así que se escribe en el host (UPLOAD_DIR temporal), se copia con
 *               `docker cp` y la BD debe apuntar a /app/uploads.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPdf, buildDocx } from './lib/seed-file-builders.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(scriptDir, 'seed_full_up.sql');

const uploadDir =
  process.env.UPLOAD_DIR ||
  path.join(scriptDir, '..', 'services', 'storage-service', 'uploads');

const prefixIndex = process.argv.indexOf('--storage-prefix');
const storagePrefix =
  (prefixIndex !== -1 && process.argv[prefixIndex + 1]) || process.env.SEED_STORAGE_PREFIX || null;

const outIndex = process.argv.indexOf('--out');
const outPath =
  outIndex !== -1 && process.argv[outIndex + 1]
    ? process.argv[outIndex + 1]
    : path.join(scriptDir, 'seed_file_paths.generated.sql');

// ── Extracción de las filas de `files` del seed ──────────────────────────────

/**
 * Las filas siguen el orden de columnas declarado en el INSERT:
 * (id, owner_id, original_name, stored_name, mime_type, file_size_bytes,
 *  category, entity_type, entity_id, storage_path, status, is_public)
 */
function parseSeededFiles(sql) {
  const insertStart = sql.indexOf('INSERT INTO "files"');
  if (insertStart === -1) {
    throw new Error('No se encontró el INSERT de "files" en seed_full_up.sql');
  }
  const block = sql.slice(insertStart, sql.indexOf('ON CONFLICT', insertStart));

  const rows = [];
  const rowPattern = /\(\s*'([0-9a-f-]{36})'\s*,(.*?)\)\s*(?:,|$)/gs;

  for (const match of block.matchAll(rowPattern)) {
    const values = splitSqlValues(match[2]);
    if (values.length < 11) continue;
    rows.push({
      id: match[1],
      originalName: values[1],
      storedName: values[2],
      mimeType: values[3],
    });
  }

  if (rows.length === 0) {
    throw new Error('No se pudo interpretar ninguna fila de "files"');
  }
  return rows;
}

/** Divide una lista de valores SQL respetando las comillas simples escapadas. */
function splitSqlValues(raw) {
  const values = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === "'") {
      if (inString && raw[i + 1] === "'") {
        current += "'";
        i++;
        continue;
      }
      inString = !inString;
      continue;
    }
    if (char === ',' && !inString) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

// ── Generadores de contenido ────────────────────────────────────────────────

function buildContent(file) {
  if (file.mimeType.includes('wordprocessingml')) return buildDocx(file.originalName);
  if (file.mimeType === 'application/pdf') return buildPdf(file.originalName);
  return Buffer.from(`Archivo de ejemplo: ${file.originalName}\n`, 'utf8');
}

// ── Ejecución ────────────────────────────────────────────────────────────────

const sql = fs.readFileSync(seedPath, 'utf8');
const files = parseSeededFiles(sql);

fs.mkdirSync(uploadDir, { recursive: true });

const statements = [
  '-- Generado por generate-seed-files.mjs. No editar a mano.',
  "SET client_encoding = 'UTF8';",
  '\\c storage_db;',
  "SET client_encoding = 'UTF8';",
];

for (const file of files) {
  const target = path.join(uploadDir, file.storedName);
  const content = buildContent(file);
  fs.writeFileSync(target, content);

  // PostgreSQL trata la barra invertida como carácter literal mientras
  // `standard_conforming_strings` esté activo (lo está por defecto), así que
  // duplicarla almacenaría rutas de Windows con barras dobles. Solo se escapa
  // la comilla simple.
  const dbPath = storagePrefix
    ? `${storagePrefix.replace(/[\\/]+$/, '')}/${file.storedName}`
    : target;
  const escapedPath = dbPath.replace(/'/g, "''");
  statements.push(
    `UPDATE "files" SET storage_path = '${escapedPath}', file_size_bytes = ${content.length} WHERE id = '${file.id}';`,
  );
}

fs.writeFileSync(outPath, statements.join('\n') + '\n', 'utf8');

console.log(`Generados ${files.length} archivos en ${uploadDir}`);
console.log(`SQL de rutas escrito en ${outPath}`);
