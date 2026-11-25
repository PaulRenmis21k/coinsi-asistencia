// Proxy serverless para consultar RENIEC desde Vercel sin exponer tokens.
// Ruta pública: /api/buscar/dni/{dni}
import https from 'node:https';
import fetch from 'node-fetch';

const RENIEC_BASE = String(process.env.URL_RENIEC || 'https://api.reniec.cloud/dni/').replace(
  /\/?$/,
  '/',
);

// El proveedor usa un certificado que Node no valida por defecto; el backend
// Express ya consulta con esta misma configuración.
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const raw = Array.isArray(req.query.dni) ? req.query.dni[0] : req.query.dni;
  const dni = String(raw || '').replace(/\D/g, '').slice(0, 8);

  if (dni.length !== 8) {
    return res.status(400).json({ error: 'El DNI debe tener 8 dígitos.' });
  }

  try {
    const response = await fetch(`${RENIEC_BASE}${dni}`, {
      agent: httpsAgent,
      redirect: 'manual',
      timeout: 9000,
      headers: { Accept: 'application/json' },
    });

    if (response.status >= 300 && response.status < 400) {
      // No seguimos redirecciones para no enviar el DNI a otro host ni por http.
      console.error('[reniec] redirección no seguida', response.status);
      return res.status(502).json({ error: 'La consulta RENIEC no está disponible.' });
    }

    const text = await response.text();

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      console.error(
        '[reniec] respuesta no JSON',
        response.status,
        response.headers.get('content-type'),
      );
      return res.status(502).json({ error: 'La consulta RENIEC no devolvió una respuesta válida.' });
    }

    return res.status(200).json({ datos: body });
  } catch (error) {
    console.error('[reniec] error de conexión', error?.code || error?.type);
    const timedOut = error?.type === 'request-timeout' || error?.code === 'ECONNABORTED';
    return res.status(502).json({
      error: timedOut
        ? 'La consulta RENIEC tardó demasiado. Intenta nuevamente.'
        : 'No se pudo consultar RENIEC en este momento.',
    });
  }
}
