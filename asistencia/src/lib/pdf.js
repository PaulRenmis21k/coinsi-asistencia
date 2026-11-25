// Generación del reporte PDF de asistencia con jsPDF + jspdf-autotable.

import { jsPDF } from 'jspdf';
// El paquete expone la función en su build ESM; el entry raíz devuelve un objeto interop.
import autoTable from 'jspdf-autotable/es';
import { formatDate, formatLongDate, formatTime, isoDate, truncate } from './format.js';

const BRAND = [43, 74, 181];
const BRAND_DARK = [24, 44, 110];
const INK = [15, 23, 42];
const MUTED = [86, 98, 118];
const LINE = [226, 231, 240];
const ZEBRA = [246, 248, 252];

function text(value, fallback = '') {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

export function pdfFileName() {
  return `asistencia_COINSI_sesion_${isoDate()}.pdf`;
}

export function sortRecords(records, order = 'time') {
  const list = [...records];
  if (order === 'name') {
    list.sort((a, b) =>
      text(a.nombres).localeCompare(text(b.nombres), 'es', { sensitivity: 'base' }),
    );
  } else {
    list.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }
  return list;
}

/**
 * Construye el documento PDF. Devuelve el objeto jsPDF para previsualizar o descargar.
 * Opciones: records, config, sessionLabel, order ('time' | 'name'), orientation ('portrait' | 'landscape').
 */
export function buildAttendancePdf({
  records,
  config,
  sessionLabel,
  order = 'time',
  orientation = 'portrait',
}) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  const list = sortRecords(records, order);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const now = new Date();

  doc.setProperties({
    title: `Asistencia · ${text(config.eventName, 'Congreso COINSI')}`,
    subject: `Reporte de asistencia · ${sessionLabel}`,
    author: 'COINSI',
    creator: 'Sistema de asistencia COINSI',
  });

  // ---- Encabezado principal ----
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 31, 'F');
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 31, pageW, 1.6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(truncate(text(config.eventName, 'Congreso COINSI'), 60), margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(truncate(text(config.place, 'Perú'), 64), margin, 19.5);
  doc.text(`Sesión: ${truncate(text(sessionLabel, 'Todas las sesiones'), 44)}`, margin, 25.5);

  doc.setFontSize(8.4);
  doc.text('REPORTE DE ASISTENCIA', pageW - margin, 12, { align: 'right' });
  doc.text(`Emitido: ${formatDate(now)} · ${formatTime(now)}`, pageW - margin, 18, { align: 'right' });
  doc.text('COINSI · Congreso de la escuela profesional', pageW - margin, 24, { align: 'right' });

  // ---- Resumen ----
  const bySchool = new Map();
  list.forEach((record) => {
    const key = text(record.escuela, 'Sin escuela');
    bySchool.set(key, (bySchool.get(key) || 0) + 1);
  });
  const schools = [...bySchool.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'),
  );
  const uniqueDni = new Set(list.map((record) => record.dni)).size;
  const schoolsText = schools.length
    ? schools.map(([name, count]) => `${name}: ${count}`).join('   ·   ')
    : 'Sin registros para la selección.';

  doc.setFontSize(8.2);
  const schoolLines = doc.splitTextToSize(schoolsText, contentW - 34);
  const boxTop = 38;
  const boxH = 24 + Math.max(1, schoolLines.length) * 4;

  doc.setFillColor(246, 248, 252);
  doc.roundedRect(margin, boxTop, contentW, boxH, 2.2, 2.2, 'F');
  doc.setFillColor(...BRAND);
  doc.roundedRect(margin, boxTop, 1.8, boxH, 1, 1, 'F');

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Resumen de asistencia', margin + 6, boxTop + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.text(`Total de asistentes: ${list.length}`, margin + 6, boxTop + 13.5);
  doc.text(`DNI únicos: ${uniqueDni}`, margin + 62, boxTop + 13.5);
  doc.text(`Escuelas: ${schools.length}`, margin + 100, boxTop + 13.5);

  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text('Por escuela:', margin + 6, boxTop + 20);
  doc.setTextColor(...INK);
  doc.setFontSize(8.2);
  doc.text(schoolLines, margin + 27, boxTop + 20);

  const tableY = boxTop + boxH + 9;

  // ---- Tabla de asistentes ----
  if (list.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('No hay asistentes registrados para la selección elegida.', margin, tableY + 6);
    doc.setFont('helvetica', 'normal');
  } else {
    autoTable(doc, {
      head: [['N°', 'DNI', 'Nombres y apellidos', 'Escuela', 'Fecha', 'Hora', 'Fuente']],
      body: list.map((record, index) => [
        String(index + 1),
        record.dni,
        text(record.nombres, '—'),
        text(record.escuela, '—'),
        record.fecha,
        record.hora,
        record.source,
      ]),
      startY: tableY,
      margin: { top: 22, left: margin, right: margin, bottom: 22 },
      theme: 'plain',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 8.3,
        cellPadding: { top: 2.6, bottom: 2.6, left: 2.2, right: 2.2 },
        textColor: INK,
        lineColor: LINE,
        lineWidth: 0.15,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: BRAND,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.1,
        lineColor: BRAND,
        lineWidth: 0.15,
      },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { cellWidth: contentW * 0.055, halign: 'center' },
        1: { cellWidth: contentW * 0.11 },
        2: { cellWidth: contentW * 0.33 },
        3: { cellWidth: contentW * 0.22 },
        4: { cellWidth: contentW * 0.1, halign: 'center' },
        5: { cellWidth: contentW * 0.09, halign: 'center' },
        6: { cellWidth: contentW * 0.095, halign: 'center' },
      },
      didDrawPage: (data) => {
        // Cabecera secundaria en las páginas siguientes a la primera.
        if (data.pageNumber > 1) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(...INK);
          doc.text(truncate(text(config.eventName, 'Congreso COINSI'), 55), margin, 12);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...MUTED);
          doc.text(
            `${truncate(text(sessionLabel, ''), 32)} · ${truncate(text(config.place, 'Perú'), 30)}`,
            pageW - margin,
            12,
            { align: 'right' },
          );

          doc.setDrawColor(...LINE);
          doc.setLineWidth(0.2);
          doc.line(margin, 14.5, pageW - margin, 14.5);
        }
      },
    });
  }

  // ---- Espacio para firma ----
  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : tableY + 12;
  if (finalY + 44 > pageH - 24) {
    doc.addPage();
    finalY = 24;
  }

  const signatureY = finalY + 24;
  const centerX = margin + contentW / 2;

  doc.setDrawColor(118, 129, 146);
  doc.setLineWidth(0.3);
  doc.line(centerX - 38, signatureY, centerX + 38, signatureY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.6);
  doc.setTextColor(...MUTED);
  doc.text('Nombre y firma del responsable', centerX, signatureY + 5, { align: 'center' });
  doc.setFontSize(8);
  doc.text(
    `${text(config.place, 'Perú')}, ${formatLongDate(now)}`,
    centerX,
    signatureY + 10,
    { align: 'center' },
  );

  // ---- Pie de página con numeración ----
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...MUTED);
    doc.text(
      'Sistema de asistencia COINSI · Datos personales tratados según la Ley 29733',
      margin,
      pageH - 11,
    );
    doc.text(`Página ${page} de ${totalPages}`, pageW - margin, pageH - 11, { align: 'right' });
  }

  return doc;
}

export function pdfBlobUrl(doc) {
  return URL.createObjectURL(doc.output('blob'));
}
