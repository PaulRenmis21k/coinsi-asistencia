import { DEFAULT_CONFIG, LOCAL_API_URL, STORAGE_KEY } from './constants.js';

const SOURCE_VALUES = ['Padrón', 'RENIEC', 'Manual'];
const STORAGE_VERSION = 2;

function cleanPerson(item) {
  if (!item || typeof item !== 'object') return null;
  const dni = String(item.dni ?? '').replace(/\D/g, '').slice(0, 8);
  if (dni.length !== 8) return null;
  return {
    dni,
    nombres: String(item.nombres || '').replace(/\s+/g, ' ').trim() || 'Sin nombre',
    escuela: String(item.escuela || '').replace(/\s+/g, ' ').trim(),
  };
}

function cleanRecord(item) {
  if (!item || typeof item !== 'object') return null;
  const dni = String(item.dni ?? '').replace(/\D/g, '').slice(0, 8);
  const session = String(item.session || '').trim();
  if (dni.length !== 8 || !session) return null;
  return {
    id:
      typeof item.id === 'string' && item.id
        ? item.id
        : `r-${dni}-${item.ts || Date.now()}`,
    dni,
    nombres: String(item.nombres || '').replace(/\s+/g, ' ').trim() || 'Sin nombre',
    escuela: String(item.escuela || '').replace(/\s+/g, ' ').trim(),
    session,
    fecha: String(item.fecha || ''),
    hora: String(item.hora || ''),
    ts: Number(item.ts) || 0,
    source: SOURCE_VALUES.includes(item.source) ? item.source : 'Manual',
  };
}

// Aplica la forma esperada a un estado leído desde cualquier origen.
function normalizeState(data) {
  const padron = Array.isArray(data?.padron)
    ? data.padron.map(cleanPerson).filter(Boolean)
    : [];
  const records = Array.isArray(data?.records)
    ? data.records.map(cleanRecord).filter(Boolean)
    : [];

  const config = {
    ...DEFAULT_CONFIG,
    ...(data?.config && typeof data.config === 'object' ? data.config : {}),
  };

  // Migración: las instalaciones antiguas (sin API o con localhost:4000) pasan a la
  // API relativa del proyecto, que funciona igual en desarrollo y en Vercel.
  const configuredApi = String(config.apiUrl || '').trim();
  if (!configuredApi || /^https?:\/\/(localhost|127\.0\.0\.1):4000\//i.test(configuredApi)) {
    config.apiUrl = LOCAL_API_URL;
  }
  config.apiMigrated = true;

  return { config, padron, records };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return normalizeState(parsed);
  } catch (error) {
    console.warn('No se pudo leer el almacenamiento local:', error);
    return null;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        config: state.config,
        padron: state.padron,
        records: state.records,
      }),
    );
    return true;
  } catch (error) {
    console.warn('No se pudo guardar en el almacenamiento local:', error);
    return false;
  }
}

export function clearStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo borrar el almacenamiento local:', error);
  }
}

export function createBackup(state) {
  return {
    app: 'COINSI',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    config: state.config,
    padron: state.padron,
    records: state.records,
  };
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.records)) {
    throw new Error('El archivo no tiene el formato de respaldo esperado.');
  }
  return normalizeState(data);
}
