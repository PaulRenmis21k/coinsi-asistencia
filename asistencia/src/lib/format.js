// Utilidades de formato y normalización (fechas peruanas, DNI, nombres).

const pad = (value) => String(value).padStart(2, '0');

export function formatDate(date = new Date()) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function isoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatLongDate(date = new Date()) {
  try {
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return formatDate(date);
  }
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-PE').format(Number(value) || 0);
}

/**
 * Extrae los 8 dígitos del DNI ignorando cualquier carácter adicional
 * que agregue el lector o el usuario (saltos de línea, guiones, etc.).
 */
export function extractDni(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const match = digits.match(/\d{8}/);
  return match ? match[0] : '';
}

export function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function cleanName(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function initials(name = '') {
  const parts = cleanName(name).split(' ').filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function truncate(value, max = 60) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Devuelve el texto entre signos para nombres muy largos en tablas. */
export function shortName(name = '', max = 34) {
  return truncate(cleanName(name) || 'Sin nombre', max);
}
