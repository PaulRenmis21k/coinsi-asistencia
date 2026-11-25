import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Eye, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { buildAttendanceCsv } from '../../lib/csv.js';
import { downloadText } from '../../lib/download.js';
import { isoDate } from '../../lib/format.js';
import { buildAttendancePdf, pdfBlobUrl, pdfFileName, sortRecords } from '../../lib/pdf.js';
import { printAttendance } from '../../lib/print.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Field from '../ui/Field.jsx';

export default function ExportModal({ open, onClose }) {
  const { records, config, notify } = useApp();
  const [session, setSession] = useState('all');
  const [order, setOrder] = useState('time');
  const [orientation, setOrientation] = useState('portrait');
  const [previewUrl, setPreviewUrl] = useState('');
  const urlRef = useRef('');

  const clearPreview = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = '';
    }
    setPreviewUrl('');
  }, []);

  useEffect(() => {
    clearPreview();
  }, [session, order, orientation, clearPreview]);

  useEffect(() => {
    if (!open) clearPreview();
  }, [open, clearPreview]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const sessions = useMemo(
    () =>
      [...new Set([config.session, ...records.map((record) => record.session)])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [config.session, records],
  );

  const selection = useMemo(
    () => records.filter((record) => session === 'all' || record.session === session),
    [records, session],
  );

  const sessionLabel = session === 'all' ? 'Todas las sesiones' : session;
  const fileName = pdfFileName();

  const buildOptions = () => ({
    records: selection,
    config,
    sessionLabel,
    order,
    orientation,
  });

  const handlePreview = () => {
    try {
      const doc = buildAttendancePdf(buildOptions());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = pdfBlobUrl(doc);
      urlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      notify(`No se pudo generar la vista previa: ${error.message}`, { type: 'error' });
    }
  };

  const handleDownload = () => {
    try {
      const doc = buildAttendancePdf(buildOptions());
      doc.save(fileName);
      notify('Reporte PDF descargado.', { type: 'success', duration: 2800 });
    } catch (error) {
      notify(`No se pudo generar el PDF: ${error.message}`, { type: 'error' });
    }
  };

  const handleCsv = () => {
    try {
      const csv = buildAttendanceCsv(sortRecords(selection, order));
      downloadText(
        csv,
        `asistencia_COINSI_${isoDate()}.csv`,
        'text/csv;charset=utf-8',
      );
      notify('Reporte CSV descargado.', { type: 'success', duration: 2800 });
    } catch (error) {
      notify(`No se pudo generar el CSV: ${error.message}`, { type: 'error' });
    }
  };

  const handlePrint = () => {
    try {
      printAttendance({
        records: sortRecords(selection, order),
        config,
        sessionLabel,
      });
      notify('Abriendo la vista de impresión…', { type: 'info', duration: 2600 });
    } catch (error) {
      notify(error.message, { type: 'error' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exportar reporte"
      description="Elige la sesión, el orden y la orientación. Puedes revisar el PDF antes de descargarlo."
      size="lg"
      footer={
        previewUrl ? (
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={clearPreview}>
              Opciones
            </Button>
            <Button variant="primary" icon={Download} onClick={handleDownload}>
              Descargar PDF
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" icon={Printer} onClick={handlePrint}>
              Imprimir
            </Button>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={handleCsv}>
              CSV
            </Button>
            <Button variant="secondary" icon={Eye} onClick={handlePreview}>
              Vista previa
            </Button>
            <Button variant="primary" icon={Download} onClick={handleDownload}>
              Descargar PDF
            </Button>
          </>
        )
      }
    >
      {previewUrl ? (
        <div className="preview">
          <div className="preview__bar">
            <FileText size={16} aria-hidden="true" />
            <span className="preview__filename">{fileName}</span>
          </div>
          <iframe className="preview__frame" src={previewUrl} title="Vista previa del reporte PDF" />
        </div>
      ) : (
        <div>
          <div className="form-grid">
            <Field label="Sesión a exportar" htmlFor="export-session">
              <select
                id="export-session"
                className="select select--block"
                value={session}
                onChange={(event) => setSession(event.target.value)}
                data-autofocus
              >
                <option value="all">Todas las sesiones ({records.length})</option>
                {sessions.map((item) => (
                  <option key={item} value={item}>
                    {item} ({records.filter((record) => record.session === item).length})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Orden de la tabla" htmlFor="export-order">
              <select
                id="export-order"
                className="select select--block"
                value={order}
                onChange={(event) => setOrder(event.target.value)}
              >
                <option value="time">Por hora de registro</option>
                <option value="name">Alfabético por nombre</option>
              </select>
            </Field>

            <Field label="Orientación del PDF" htmlFor="export-orientation">
              <select
                id="export-orientation"
                className="select select--block"
                value={orientation}
                onChange={(event) => setOrientation(event.target.value)}
              >
                <option value="portrait">Vertical (A4)</option>
                <option value="landscape">Horizontal (A4)</option>
              </select>
            </Field>
          </div>

          <div className="export-summary">
            <strong>
              {selection.length} {selection.length === 1 ? 'asistente' : 'asistentes'} ·{' '}
              {sessionLabel}
            </strong>
            <span>Archivo: {fileName}</span>
            {selection.length === 0 ? (
              <span>No hay registros para esta selección; el reporte saldrá sin filas.</span>
            ) : null}
          </div>

          <p className="export-notes">
            El PDF incluye el encabezado del evento, el resumen por escuela, la tabla con filas
            alternadas, la numeración de páginas y el espacio para la firma del responsable. Si no
            hay conexión o prefieres papel, usa <strong>Imprimir</strong> como respaldo.
          </p>
        </div>
      )}
    </Modal>
  );
}
