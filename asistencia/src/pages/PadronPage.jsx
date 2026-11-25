import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Download,
  FileUp,
  GraduationCap,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { PADRON_PAGE_SIZE } from '../lib/constants.js';
import { buildPadronTemplate, importPadronCsv } from '../lib/csv.js';
import { downloadText } from '../lib/download.js';
import { formatNumber, normalize } from '../lib/format.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

export default function PadronPage({ onNavigate }) {
  const { padron, records, config, setPadron, clearPadron, notify } = useApp();

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState('replace');
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [summary, setSummary] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef(null);

  const attended = useMemo(
    () =>
      new Set(
        records
          .filter((record) => record.session === config.session)
          .map((record) => record.dni),
      ),
    [records, config.session],
  );

  const schoolsCount = useMemo(
    () => new Set(padron.map((person) => person.escuela).filter(Boolean)).size,
    [padron],
  );

  const coverage = padron.length
    ? Math.min(100, Math.round((attended.size / padron.length) * 100))
    : null;

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return padron;
    return padron.filter(
      (person) =>
        person.dni.includes(term) ||
        normalize(person.nombres).includes(term) ||
        normalize(person.escuela).includes(term),
    );
  }, [padron, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PADRON_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PADRON_PAGE_SIZE,
    currentPage * PADRON_PAGE_SIZE,
  );

  const applyText = (text, sourceName) => {
    const { entries, errors } = importPadronCsv(text);
    if (!entries.length) {
      setSummary({
        count: 0,
        errors: errors.length ? errors : ['No se encontraron DNIs válidos.'],
        source: sourceName,
      });
      notify('No se encontraron DNIs válidos en el archivo.', { type: 'error' });
      return;
    }

    setPadron(entries, mode);
    setSummary({ count: entries.length, errors, source: sourceName });
    setPasteText('');
    setShowPaste(false);
    setPage(1);
    notify(
      `${entries.length} inscritos ${mode === 'merge' ? 'agregados' : 'importados'} al padrón.`,
      { type: 'success' },
    );
  };

  const readFile = async (file) => {
    if (!file) return;
    try {
      const content = await file.text();
      applyText(content, file.name);
    } catch (error) {
      notify(`No se pudo leer el archivo: ${error.message}`, { type: 'error' });
    }
  };

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    readFile(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    readFile(event.dataTransfer.files?.[0]);
  };

  const downloadTemplate = () => {
    downloadText(
      buildPadronTemplate(),
      'plantilla_padron_COINSI.csv',
      'text/csv;charset=utf-8',
    );
    notify('Plantilla CSV descargada.', { type: 'info', duration: 2600 });
  };

  const confirmVaciar = () => {
    clearPadron();
    setConfirmClear(false);
    setSummary(null);
    notify('El padrón se vació. Los registros de asistencia se conservan.', {
      type: 'warning',
    });
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">Inscritos al congreso</p>
          <h1 className="page-title">Padrón</h1>
          <p className="page-sub">
            Importa la lista de inscritos para validar asistencias y calcular el avance.
          </p>
        </div>
        <div className="page-actions">
          <Button icon={Download} onClick={downloadTemplate}>
            Descargar plantilla
          </Button>
        </div>
      </header>

      <section className="stats-grid stats-grid--three" aria-label="Resumen del padrón">
        <StatCard
          icon={Users}
          label="Inscritos"
          value={formatNumber(padron.length)}
          hint="Total en el padrón"
          tone="brand"
        />
        <StatCard
          icon={GraduationCap}
          label="Escuelas"
          value={formatNumber(schoolsCount)}
          hint="Escuelas representadas"
          tone="neutral"
        />
        <StatCard
          icon={CheckCircle2}
          label="Cobertura de la sesión"
          value={coverage === null ? '—' : `${coverage}%`}
          hint={
            padron.length
              ? `${formatNumber(attended.size)} de ${formatNumber(padron.length)} ya asistieron`
              : 'Importa el padrón para medir'
          }
          tone="success"
        >
          <div
            className="progress"
            role="progressbar"
            aria-label="Cobertura de asistencia sobre el padrón"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={coverage ?? 0}
          >
            <span style={{ width: `${coverage ?? 0}%` }} />
          </div>
        </StatCard>
      </section>

      <section className="panel" aria-labelledby="import-title">
        <header className="panel__head">
          <div>
            <h2 id="import-title" className="panel__title">
              Importar padrón
            </h2>
            <p className="panel__hint">
              Archivo CSV con columnas <strong>DNI</strong>, <strong>Nombres</strong> y{' '}
              <strong>Escuela</strong>. Se aceptan coma, punto y coma o tabulaciones.
            </p>
          </div>
          <Badge tone="brand">CSV</Badge>
        </header>

        <div
          className={`dropzone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="dropzone__icon" aria-hidden="true">
            <FileUp size={24} />
          </span>
          <p className="dropzone__title">Arrastra tu archivo CSV aquí</p>
          <p className="dropzone__hint">
            También puedes elegirlo desde tu equipo o pegar el contenido directamente.
          </p>
          <div className="dropzone__actions">
            <Button variant="primary" icon={Upload} onClick={() => fileRef.current?.click()}>
              Elegir archivo CSV
            </Button>
            <Button variant="ghost" onClick={() => setShowPaste((prev) => !prev)}>
              {showPaste ? 'Ocultar pegado' : 'Pegar CSV'}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={onFileChange}
            tabIndex={-1}
          />
        </div>

        <div className="import-mode">
          <span className="import-mode__label">Al importar:</span>
          <Segmented
            options={[
              { value: 'replace', label: 'Reemplazar padrón' },
              { value: 'merge', label: 'Agregar al padrón' },
            ]}
            value={mode}
            onChange={setMode}
            ariaLabel="Modo de importación del padrón"
          />
        </div>

        {showPaste ? (
          <div className="paste-area">
            <label className="field__label" htmlFor="padron-paste">
              Contenido CSV
            </label>
            <textarea
              id="padron-paste"
              className="textarea"
              rows={6}
              placeholder={'DNI,Nombres,Escuela\n70123456,PÉREZ GÓMEZ MARÍA,Ingeniería de Sistemas'}
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
            />
            <div className="paste-area__actions">
              <Button
                variant="primary"
                onClick={() => {
                  if (!pasteText.trim()) {
                    notify('Pega primero el contenido CSV.', { type: 'warning' });
                    return;
                  }
                  applyText(pasteText, 'texto pegado');
                }}
              >
                Importar texto
              </Button>
              <Button variant="ghost" onClick={() => setPasteText('')}>
                Limpiar
              </Button>
            </div>
          </div>
        ) : null}

        {summary ? (
          <div
            className={`inline-note ${
              summary.count ? 'inline-note--success' : 'inline-note--warning'
            }`}
            role="status"
          >
            <div>
              <strong>
                {summary.count
                  ? `${summary.count} inscritos importados`
                  : 'No se importaron inscritos'}
              </strong>
              {summary.source ? <span> · {summary.source}</span> : null}
              {summary.errors.length ? (
                <ul className="import-errors">
                  {summary.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSummary(null)}
              aria-label="Ocultar resumen de importación"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="padron-title">
        <header className="panel__head panel__head--wrap">
          <div>
            <h2 id="padron-title" className="panel__title">
              Inscritos
            </h2>
            <p className="panel__hint">
              {filtered.length} de {padron.length} inscritos visibles
            </p>
          </div>
          <div className="panel__tools">
            <div className="search">
              <Search size={16} aria-hidden="true" />
              <label htmlFor="padron-search" className="sr-only">
                Buscar en el padrón
              </label>
              <input
                id="padron-search"
                type="search"
                placeholder="Buscar por DNI, nombre o escuela"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {padron.length ? (
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmClear(true)}>
                Vaciar
              </Button>
            ) : null}
          </div>
        </header>

        {padron.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="El padrón está vacío"
            description="Importa el CSV de inscritos para validar automáticamente a los asistentes y calcular el porcentaje de asistencia."
            action={
              <Button variant="primary" icon={Upload} onClick={() => fileRef.current?.click()}>
                Importar padrón
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Sin coincidencias"
            description="Ningún inscrito coincide con la búsqueda."
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Limpiar búsqueda
              </Button>
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">DNI</th>
                    <th scope="col">Nombres y apellidos</th>
                    <th scope="col">Escuela</th>
                    <th scope="col">Estado en {config.session}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((person) => (
                    <tr key={person.dni}>
                      <td className="cell-dni">{person.dni}</td>
                      <td>
                        <div className="person">
                          <span className="person__name">{person.nombres}</span>
                        </div>
                      </td>
                      <td className="cell-muted">{person.escuela || '—'}</td>
                      <td>
                        {attended.has(person.dni) ? (
                          <Badge tone="success" dot>
                            Asistió
                          </Badge>
                        ) : (
                          <Badge tone="neutral" dot>
                            Pendiente
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={currentPage}
              pageCount={pageCount}
              onPage={setPage}
              total={filtered.length}
              pageSize={PADRON_PAGE_SIZE}
            />
          </>
        )}
      </section>

      <p className="page-footnote">
        Los datos del padrón se guardan solo en este navegador. <button type="button" className="link" onClick={() => onNavigate?.('settings')}>Ver aviso de privacidad</button>.
      </p>

      <ConfirmDialog
        open={confirmClear}
        title="Vaciar el padrón"
        description="Se eliminarán todos los inscritos importados. Los registros de asistencia ya tomados se conservan. Esta acción no se puede deshacer."
        confirmLabel="Sí, vaciar padrón"
        danger
        onConfirm={confirmVaciar}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
