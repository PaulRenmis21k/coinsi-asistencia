// Consulta de RENIEC a través de un proveedor autorizado configurable.
import { LOCAL_API_URL } from './constants.js';

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/**
 * Desenvuelve respuestas del estilo { data }, { datos } o { datos: { data } }.
 * La API local de Express responde { datos: { ... } }.
 */
export function unwrapPayload(payload) {
  let node = payload;
  for (let level = 0; level < 3; level += 1) {
    if (!node || typeof node !== 'object') return {};
    if (node.datos && typeof node.datos === 'object') node = node.datos;
    else if (node.data && typeof node.data === 'object') node = node.data;
    else break;
  }
  return node && typeof node === 'object' ? node : {};
}

/** Normaliza las distintas formas de respuesta de los proveedores. */
export function parsePerson(payload) {
  const data = unwrapPayload(payload);

  const full = firstString(
    data.nombre_completo,
    data.nombreCompleto,
    data.nombres_completos,
    data.razon_social,
  );
  if (full) {
    return { nombres: full.replace(/\s+/g, ' '), escuela: firstString(data.escuela) };
  }

  const nombres = firstString(data.nombres, data.nombre);
  const paterno = firstString(data.apellidoPaterno, data.apellido_paterno, data.paterno);
  const materno = firstString(data.apellidoMaterno, data.apellido_materno, data.materno);
  const apellidos = firstString(data.apellidos, data.apellido);

  const complete = [nombres, paterno, materno].filter(Boolean).join(' ');
  const fallback = [nombres, apellidos].filter(Boolean).join(' ');
  const finalName = complete || fallback;

  if (!finalName) return null;
  return { nombres: finalName.replace(/\s+/g, ' '), escuela: firstString(data.escuela) };
}

/**
 * Realiza la consulta con token Bearer.
 * La URL debe incluir el marcador {dni}.
 */
export async function lookupReniec(dni, config) {
  // Si no hay URL configurada se usa la API relativa del proyecto.
  const template = String(config?.apiUrl || '').trim() || LOCAL_API_URL;
  if (!template.includes('{dni}')) throw new Error('La URL de la API debe incluir el marcador {dni}.');

  const url = template.replace('{dni}', encodeURIComponent(dni));
  const headers = { Accept: 'application/json' };
  if (config?.apiToken) headers.Authorization = `Bearer ${config.apiToken}`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    let response;
    try {
      response = await fetch(url, { headers, signal: controller.signal });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('La consulta a RENIEC demoró demasiado. Revisa tu conexión.');
      }
      throw new Error(
        'No se pudo conectar con la API de RENIEC. Revisa tu conexión; en local verifica que el backend esté activo con npm start.',
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('El token de la API no es válido o no tiene permisos.');
      }
      if (response.status === 404) {
        throw new Error('RENIEC no encontró información para ese DNI.');
      }
      if (response.status === 429) {
        throw new Error('Se alcanzó el límite de consultas del proveedor. Intenta más tarde.');
      }
      throw new Error(`La API respondió con error ${response.status}.`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('La API devolvió una respuesta que no es JSON.');
    }

    const body = unwrapPayload(payload);
    if (payload?.success === false || payload?.error || body.success === false || body.error) {
      const message =
        typeof body.message === 'string'
          ? body.message
          : typeof body.error === 'string'
            ? body.error
            : typeof payload?.message === 'string'
              ? payload.message
              : 'El proveedor rechazó la consulta. Verifica el DNI y el token.';
      throw new Error(message);
    }

    const person = parsePerson(payload);
    if (!person) {
      const providerMessage = typeof body.message === 'string' ? body.message : '';
      if (/not found|no encontrado|no existe|sin resultados/i.test(providerMessage)) {
        throw new Error(
          'RENIEC no encontró información para ese DNI. Puedes registrarlo manualmente.',
        );
      }
      throw new Error('La API no devolvió nombres para ese DNI.');
    }
    return person;
  } finally {
    window.clearTimeout(timeout);
  }
}
