// Respaldo de exportación: impresión directa del reporte con estilos @media print.

import { formatLongDate } from './format.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export function printAttendance({ records, config, sessionLabel }) {
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes.');
  }

  const bySchool = new Map();
  records.forEach((record) => {
    const key = record.escuela?.trim() || 'Sin escuela';
    bySchool.set(key, (bySchool.get(key) || 0) + 1);
  });
  const schoolsText = [...bySchool.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .map(([name, count]) => `${esc(name)}: ${count}`)
    .join(' · ');

  const rows = records
    .map(
      (record, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${esc(record.dni)}</td>
          <td>${esc(record.nombres)}</td>
          <td>${esc(record.escuela || '—')}</td>
          <td class="center">${esc(record.fecha)}</td>
          <td class="center">${esc(record.hora)}</td>
          <td class="center">${esc(record.source)}</td>
        </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8" />
<title>Asistencia · ${esc(config.eventName)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10pt; }
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  header { background: #2b4ab5; color: #fff; padding: 16px 18px; border-radius: 3px; }
  header h1 { margin: 0 0 4px; font-size: 17pt; }
  header p { margin: 0; font-size: 9pt; opacity: .92; }
  .meta { display: flex; justify-content: space-between; gap: 16px; margin: 10px 0 14px; font-size: 9pt; color: #566276; }
  .summary { background: #f6f8fc; border-left: 3px solid #2b4ab5; padding: 10px 14px; border-radius: 3px; margin-bottom: 14px; font-size: 9pt; }
  .summary strong { color: #0f172a; }
  .summary p { margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  thead th { background: #2b4ab5; color: #fff; text-align: left; padding: 7px 6px; font-size: 8.5pt; }
  tbody td { border-bottom: 1px solid #e6ebf5; padding: 6px; }
  tbody tr:nth-child(even) { background: #f7f9fd; }
  .center { text-align: center; }
  .signature { margin-top: 48px; text-align: center; font-size: 9pt; color: #566276; }
  .signature .line { width: 250px; margin: 0 auto 6px; border-top: 1px solid #768192; }
  footer { margin-top: 26px; border-top: 1px solid #e6ebf5; padding-top: 6px; font-size: 7.5pt; color: #6b7789; display: flex; justify-content: space-between; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <header>
    <h1>${esc(config.eventName || 'Congreso COINSI')}</h1>
    <p>${esc(config.place || 'Perú')} · Sesión: ${esc(sessionLabel)}</p>
  </header>
  <div class="meta">
    <span>Reporte de asistencia</span>
    <span>Emitido el ${esc(formatLongDate(new Date()))}</span>
  </div>
  <div class="summary">
    <p><strong>Total de asistentes:</strong> ${records.length}</p>
    <p><strong>Por escuela:</strong> ${schoolsText || 'Sin registros'}</p>
  </div>
  ${
    records.length
      ? `<table>
    <thead>
      <tr><th class="center">N°</th><th>DNI</th><th>Nombres y apellidos</th><th>Escuela</th><th class="center">Fecha</th><th class="center">Hora</th><th class="center">Fuente</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
      : '<p>No hay asistentes registrados para la selección elegida.</p>'
  }
  <div class="signature">
    <div class="line"></div>
    Nombre y firma del responsable
  </div>
  <footer>
    <span>Sistema de asistencia COINSI · Ley 29733 de Protección de Datos Personales</span>
    <span>Impreso el ${esc(new Date().toLocaleString('es-PE'))}</span>
  </footer>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 400);
}
