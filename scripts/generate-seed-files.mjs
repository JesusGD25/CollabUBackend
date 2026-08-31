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
 *   node generate-seed-files.mjs [--out <ruta-del-sql>]
 *
 * Variables de entorno:
 *   UPLOAD_DIR  Carpeta de subidas de Storage Service.
 *               Por defecto: Backend/services/storage-service/uploads
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(scriptDir, 'seed_full_up.sql');

const uploadDir =
  process.env.UPLOAD_DIR ||
  path.join(scriptDir, '..', 'services', 'storage-service', 'uploads');

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

/** PDF de una página, mínimo pero válido, con el título como texto visible. */
function buildPdf(title) {
  const text = title.replace(/[\\()]/g, '\\$&');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const stream = `BT /F1 14 Tf 60 760 Td (${text}) Tj 0 -24 Td (Documento de ejemplo generado para el entorno de desarrollo.) Tj ET`;
  objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

/**
 * DOCX mínimo: es un ZIP con tres entradas. Se construye a mano (entradas
 * "stored", sin comprimir) para no añadir dependencias al repositorio.
 */
function buildDocx(title) {
  const escaped = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const entries = [
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'word/document.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
        `<w:p><w:r><w:t>${escaped}</w:t></w:r></w:p>` +
        '<w:p><w:r><w:t>Plantilla de ejemplo generada para el entorno de desarrollo.</w:t></w:r></w:p>' +
        '</w:body></w:document>',
    },
  ];

  return buildZip(entries);
}

function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.content, 'utf8');
    const crc = zlib.crc32
      ? zlib.crc32(data)
      : crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // versión necesaria
    localHeader.writeUInt16LE(0, 6); // sin banderas
    localHeader.writeUInt16LE(0, 8); // método: almacenado
    localHeader.writeUInt16LE(0, 10); // hora
    localHeader.writeUInt16LE(0x21, 12); // fecha (1980-01-01)
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    locals.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x21, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt32LE(offset, 42);

    centrals.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuffer, end]);
}

/** CRC-32 para versiones de Node sin `zlib.crc32`. */
function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

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
  const escapedPath = target.replace(/'/g, "''");
  statements.push(
    `UPDATE "files" SET storage_path = '${escapedPath}', file_size_bytes = ${content.length} WHERE id = '${file.id}';`,
  );
}

fs.writeFileSync(outPath, statements.join('\n') + '\n', 'utf8');

console.log(`Generados ${files.length} archivos en ${uploadDir}`);
console.log(`SQL de rutas escrito en ${outPath}`);
