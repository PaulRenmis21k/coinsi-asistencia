// Importación/exportación CSV del padrón y de los registros de asistencia.

import { extractDni, normalize } from './format.js';

const HEADER_ALIASES = {
  dni: ['dni', 'documento', 'numero de documento', 'nro documento', 'n° dni', 'dni/ce', 'doc'],
  nombres: [
    'nombres y apellidos',
    'apellidos y nombres',
    'nombres completos',
    'nombre completo',
    'nombres',
    'nombre',
    'asistente',
    'participante',
  ],
  escuela: ['escuela profesional', 'escuela', 'facultad', 'programa', 'carrera', 'especialidad'],
};

function detectDelimiter(line = '') {
  const counts = { ';': 0, ',': 0, '\t': 0 };
  for (const char of line) {
    if (char in counts) counts[char] += 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ',';
}

/** Parser CSV que soporta comillas, saltos de línea y punto y coma. */
export function parseCsv(text) {
  const source = String(text ?? '').replace(/^\uFEFF/, '');
  if (!source.trim()) return [];

  const firstLine = source.split(/\r?\n/)[0];
  const delimiter = detectDelimiter(firstLine);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function findColumn(headers, aliases) {
  for (const alias of aliases) {
    const exact = headers.findIndex((header) => header === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const partial = headers.findIndex((header) => header.includes(alias));
    if (partial >= 0) return partial;
  }
  return -1;
}

/**
 * Convierte el texto CSV del padrón en inscritos.
 * Columnas esperadas: DNI, Nombres, Escuela (el orden puede variar si hay encabezados).
 */
export function importPadronCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) {
    return { entries: [], errors: ['El archivo está vacío o no tiene filas legibles.'] };
  }

  const headerCells = rows[0].map((cell) => normalize(cell));
  const hasHeader = headerCells.some(
    (cell) => cell.includes('dni') || cell.includes('nombre') || cell.includes('apellido'),
  );

  let indexes = { dni: 0, nombres: 1, escuela: 2 };
  if (hasHeader) {
    const found = {
      dni: findColumn(headerCells, HEADER_ALIASES.dni),
      nombres: findColumn(headerCells, HEADER_ALIASES.nombres),
      escuela: findColumn(headerCells, HEADER_ALIASES.escuela),
    };
    indexes = {
      dni: found.dni >= 0 ? found.dni : 0,
      nombres: found.nombres >= 0 ? found.nombres : -1,
      escuela: found.escuela >= 0 ? found.escuela : -1,
    };
  }

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const errors = [];
  const entries = [];
  const seen = new Set();

  dataRows.forEach((cells, index) => {
    if (!cells.some((cell) => cell.trim() !== '')) return;

    const dni = extractDni(cells[indexes.dni] ?? '');
    const lineNumber = index + (hasHeader ? 2 : 1);

    if (!dni) {
      if (errors.length < 8) errors.push(`Fila ${lineNumber}: DNI inválido.`);
      return;
    }
    if (seen.has(dni)) return;

    seen.add(dni);
    entries.push({
      dni,
      nombres: String(cells[indexes.nombres] ?? '').replace(/\s+/g, ' ').trim() || 'Sin nombre',
      escuela:
        indexes.escuela >= 0
          ? String(cells[indexes.escuela] ?? '').replace(/\s+/g, ' ').trim()
          : '',
    });
  });

  return { entries, errors };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV con BOM UTF-8 para que Excel respete las tildes. */
export function buildAttendanceCsv(records) {
  const header = ['N°', 'DNI', 'Nombres y apellidos', 'Escuela', 'Sesión', 'Fecha', 'Hora', 'Fuente'];
  const lines = [header.join(',')];
  records.forEach((record, index) => {
    lines.push(
      [
        index + 1,
        record.dni,
        record.nombres,
        record.escuela,
        record.session,
        record.fecha,
        record.hora,
        record.source,
      ]
        .map(csvCell)
        .join(','),
    );
  });
  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildPadronTemplate() {
  const lines = [
    'DNI,Nombres,Escuela',
    '70123456,PÉREZ GÓMEZ MARÍA,Ingeniería de Sistemas',
    '70456789,QUISPE MAMANI JOSÉ LUIS,Administración',
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}
