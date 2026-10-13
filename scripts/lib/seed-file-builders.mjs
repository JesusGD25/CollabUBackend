/**
 * Constructores de archivos de ejemplo (PDF y DOCX mínimos y válidos, sin
 * dependencias). Compartido por generate-seed-files.mjs (seed base) y
 * generate-seed-showcase.mjs (seed showcase).
 */
import zlib from 'node:zlib';

/** PDF de una página, mínimo pero válido, con el título como texto visible. */
function buildPdf(title, extraLines = []) {
  // Escapa paréntesis/barra invertida y reemplaza lo que no sea Latin-1 imprimible
  // (la fuente usa WinAnsiEncoding, que coincide con Latin-1 para tildes y ñ).
  const esc = (value) =>
    String(value).replace(/[\\()]/g, '\\$&').replace(/[^ -~¡-ÿ]/g, '?');
  const text = esc(title);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];

  const body = extraLines.length > 0
    ? extraLines
    : ['Documento de ejemplo generado para el entorno de desarrollo.'];
  const bodyOps = body.map((line) => `0 -20 Td (${esc(line)}) Tj`).join(' ');
  const stream = `BT /F1 14 Tf 60 760 Td (${text}) Tj /F1 11 Tf ${bodyOps} ET`;
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

export { buildPdf, buildDocx };
