import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  CalendarDays,
  Clock3,
  Database,
  Download,
  GraduationCap,
  History,
  Keyboard,
  ScanBarcode,
  ScanLine,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { RESULT_DURATION } from '../lib/constants.js';
import { extractDni, formatNumber, initials } from '../lib/format.js';
import { lookupReniec } from '../lib/reniec.js';
import { playAlert } from '../lib/sound.js';
import Button from '../components/ui/Button.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import Field from '../components/ui/Field.jsx';
import { SourceBadge } from '../components/ui/Badge.jsx';
import ScanResult from '../components/scan/ScanResult.jsx';
import ManualEntryModal from '../components/scan/ManualEntryModal.jsx';
import CameraScanner from '../components/scan/CameraScanner.jsx';
import LastAttendee from '../components/scan/LastAttendee.jsx';

export default function ScanPage({ inputRef, onExport, onNavigate }) {
  const { config, records, padron, padronIndex, addRecord, setConfig, notify } = useApp();

  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionDraft, setSessionDraft] = useState('');

  const resultTimer = useRef(null);
  const busy = useRef(false);

  const sessionRecords = useMemo(
    () => records.filter((record) => record.session === config.session),
    [records, config.session],
  );
  const sessionCount = useMemo(
    () => new Set(sessionRecords.map((record) => record.dni)).size,
    [sessionRecords],
  );
  const totalCount = useMemo(
    () => new Set(records.map((record) => record.dni)).size,
    [records],
  );
  const percent = padron.length
    ? Math.round((sessionCount / padron.length) * 100)
    : null;
  const pending = padron.length ? Math.max(padron.length - sessionCount, 0) : null;

  const sessions = useMemo(
    () =>
      [...new Set([config.session, ...records.map((record) => record.session)])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [config.session, records],
  );

  const recent = useMemo(
    () => [...sessionRecords].sort((a, b) => b.ts - a.ts).slice(0, 6),
    [sessionRecords],
  );
  const lastRecord = recent[0];

  const cameraSupported =
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  // Texto visible para dejar claro con qué proveedor se completan los nombres.
  const apiProvider = useMemo(() => {
    const url = config.apiUrl.trim();
    if (!url || url.startsWith('/')) return 'API del proyecto';
    try {
      const { host } = new URL(url);
      return host.includes('localhost:4000') || host.includes('127.0.0.1:4000')
        ? 'API local'
        : host;
    } catch {
      return 'API configurada';
    }
  }, [config.apiUrl]);

  const showResult = useCallback(
    (next) => {
      window.clearTimeout(resultTimer.current);
      setResult(next);
      const sound =
        next.kind === 'success'
          ? 'success'
          : next.kind === 'invalid' || next.kind === 'error'
            ? 'error'
            : 'warning';
      playAlert(sound, config.sound);
      resultTimer.current = window.setTimeout(() => setResult(null), RESULT_DURATION);
    },
    [config.sound],
  );

  useEffect(() => () => window.clearTimeout(resultTimer.current), []);

  // El cursor regresa al escáner después de cada registro y al cambiar de ventana.
  useEffect(() => {
    inputRef.current?.focus();

    const onPointerDown = (event) => {
      if (
        event.target.closest(
          'button, a, input, select, textarea, label, kbd, [role="dialog"], .modal, .toast',
        )
      ) {
        return;
      }
      inputRef.current?.focus();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') inputRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [inputRef]);

  useEffect(() => {
    if (manual || cameraOpen || sessionOpen || loading) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [manual, cameraOpen, sessionOpen, loading, inputRef]);

  const register = useCallback(
    ({ dni, nombres, escuela, source }) => {
      const record = addRecord({ dni, nombres, escuela, source });
      setValue('');
      setManual(null);
      setLoading(false);
      showResult({ kind: 'success', record });
      window.setTimeout(() => inputRef.current?.focus(), 40);
    },
    [addRecord, showResult, inputRef],
  );

  const handleScan = useCallback(
    async (raw) => {
      if (busy.current) return;

      const dni = extractDni(raw);
      if (!dni) {
        showResult({ kind: 'invalid' });
        return;
      }

      const existing = records.find(
        (record) => record.dni === dni && record.session === config.session,
      );
      if (existing) {
        showResult({ kind: 'duplicate', record: existing });
        return;
      }

      const person = padronIndex.get(dni);
      if (person) {
        register({ dni, nombres: person.nombres, escuela: person.escuela, source: 'Padrón' });
        return;
      }

      busy.current = true;
      setLoading(true);
      try {
        const data = await lookupReniec(dni, config);
        register({ dni, nombres: data.nombres, escuela: data.escuela || '', source: 'RENIEC' });
      } catch (error) {
        setManual({
          dni,
          fromScan: true,
          reason: `${error.message} Puedes completar el nombre manualmente.`,
        });
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [records, config, padronIndex, register, showResult],
  );

  const submitScan = (event) => {
    event.preventDefault();
    const raw = value;
    if (!raw.trim()) return;
    setValue('');
    handleScan(raw);
  };

  const openManual = () => setManual({ dni: '', fromScan: false, reason: '' });

  const closeManual = () => {
    const pending = manual;
    setManual(null);
    if (pending?.fromScan && pending.dni) {
      showResult({
        kind: 'nodata',
        dni: pending.dni,
        message:
          'No se registró a esta persona. Puedes intentar de nuevo o usar el ingreso manual.',
      });
    }
  };

  const submitManual = useCallback(
    (data) => {
      const existing = records.find(
        (record) => record.dni === data.dni && record.session === config.session,
      );
      if (existing) {
        setManual(null);
        showResult({ kind: 'duplicate', record: existing });
        return;
      }

      const person = padronIndex.get(data.dni);
      register({
        dni: data.dni,
        nombres: person ? person.nombres : data.nombres,
        escuela: person ? person.escuela : data.escuela,
        source: person ? 'Padrón' : 'Manual',
      });
      setManual(null);
      notify('Asistencia registrada manualmente.', { type: 'success', duration: 2600 });
    },
    [records, config.session, padronIndex, register, showResult, notify],
  );

  const handleCameraDetected = useCallback(
    (raw) => {
      setCameraOpen(false);
      handleScan(raw);
    },
    [handleScan],
  );

  const closeCamera = useCallback(() => setCameraOpen(false), []);

  const openSession = () => {
    setSessionDraft(config.session);
    setSessionOpen(true);
  };

  const saveSession = (event) => {
    event?.preventDefault?.();
    const next = sessionDraft.trim();
    if (!next) return;
    setConfig({ session: next });
    setSessionOpen(false);
    notify(`Sesión activa: ${next}`, { type: 'info', duration: 2600 });
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">
            <span className="live-dot" aria-hidden="true" />
            Bienvenido de nuevo
          </p>
          <h1 className="page-title">Control de asistencia</h1>
          <p className="page-sub">
            {config.eventName} · {config.place} · Sesión {config.session}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" icon={Download} onClick={onExport}>
            Exportar reporte
          </Button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Resumen de asistencia">
        <StatCard
          icon={Users}
          label="Presentes"
          value={formatNumber(sessionCount)}
          hint="Asistentes únicos de la sesión"
          tone="success"
        />
        <StatCard
          icon={Clock3}
          label="Pendientes"
          value={pending === null ? '—' : formatNumber(pending)}
          hint={padron.length ? 'Aún por registrar' : 'Importa el padrón'}
          tone="warning"
        />
        <StatCard
          icon={Target}
          label="Avance del padrón"
          value={percent === null ? '—' : `${percent}%`}
          hint={
            padron.length
              ? `${formatNumber(sessionCount)} de ${formatNumber(padron.length)} inscritos`
              : 'Importa el padrón para medir'
          }
          tone="brand"
        >
          <div
            className="progress"
            role="progressbar"
            aria-label="Porcentaje de asistencia de la sesión respecto al padrón"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(percent ?? 0, 100)}
          >
            <span style={{ width: `${Math.min(percent ?? 0, 100)}%` }} />
          </div>
        </StatCard>
        <StatCard
          icon={UserCheck}
          label="Total general"
          value={formatNumber(totalCount)}
          hint="DNI únicos en todas las sesiones"
          tone="neutral"
        />
      </section>

      <div className="scan-layout">
        <div className="scan-main">
        <section className="scan-card" aria-labelledby="scan-title">
          <div className="scan-card__head">
            <div className="scan-card__heading">
              <span className="scan-card__badge" aria-hidden="true">
                <ScanLine size={19} />
              </span>
              <div>
                <h2 id="scan-title">Escanea el DNI</h2>
                <p>El lector escribe el código y envía Enter automáticamente.</p>
              </div>
            </div>
            <span className={`reader-pill ${isFocused ? 'is-ready' : 'is-idle'}`}>
              <span className="reader-pill__dot" aria-hidden="true" />
              {isFocused ? 'Lector listo' : 'Haz clic para activar el lector'}
            </span>
          </div>

          <form className="scan-form" onSubmit={submitScan}>
            <label htmlFor="scan-input" className="sr-only">
              Código de barras del DNI
            </label>
            <div className={`scan-zone ${isFocused ? 'is-focused' : ''}`}>
              <ScanBarcode size={26} className="scan-zone__icon" aria-hidden="true" />
              <input
                id="scan-input"
                ref={inputRef}
                className="scan-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={48}
                placeholder="00000000"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={loading}
                aria-describedby="scan-help"
              />
              {loading ? (
                <span className="scan-zone__loading">
                  <Spinner size={20} label="Consultando RENIEC" />
                </span>
              ) : null}
            </div>
            <p id="scan-help" className="scan-help">
              Acerca el código de barras al lector USB o Bluetooth, o usa la cámara para leer el
              reverso del DNI. También puedes escribir el DNI y presionar <kbd>Enter</kbd>.
            </p>
          </form>

          {loading ? (
            <p className="scan-status" role="status">
              Consultando RENIEC… esto puede tardar unos segundos.
            </p>
          ) : null}

          <div className="scan-actions">
            <Button icon={Keyboard} onClick={openManual}>
              Ingreso manual
            </Button>
            <Button
              icon={Camera}
              variant="secondary"
              onClick={() => setCameraOpen(true)}
              disabled={!cameraSupported}
              title={
                cameraSupported
                  ? 'Escanear el código de barras del DNI con la cámara'
                  : 'La cámara requiere Chrome/Edge y localhost o HTTPS'
              }
            >
              Escanear con cámara
            </Button>
            <Button icon={CalendarDays} variant="ghost" onClick={openSession}>
              Sesión: {config.session}
            </Button>
            <span className="scan-shortcut">
              <kbd>F2</kbd> enfocar lector
            </span>
          </div>

          <div className="scan-flow">
            <Database size={14} aria-hidden="true" />
            <span>
              Búsqueda del DNI: padrón → RENIEC <strong>({apiProvider})</strong> → ingreso manual
            </span>
          </div>
        </section>

          {result ? <ScanResult result={result} onDismiss={() => setResult(null)} /> : null}

          <section className="panel recent" aria-labelledby="recent-title">
            <header className="panel__head">
              <div>
                <h2 id="recent-title" className="panel__title">
                  Últimos registros
                </h2>
                <p className="panel__hint">Sesión {config.session}</p>
              </div>
              <div className="recent__actions">
                <span className="panel__count">{formatNumber(sessionRecords.length)}</span>
                {sessionRecords.length ? (
                  <button
                    type="button"
                    className="panel__link"
                    onClick={() => onNavigate?.('attendees')}
                  >
                    Ver todos
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </header>

            {recent.length ? (
              <ul className="recent-list">
                {recent.map((record) => (
                  <li key={record.id} className="recent-item">
                    <span className="avatar" aria-hidden="true">
                      {initials(record.nombres)}
                    </span>
                    <div className="recent-item__body">
                      <p className="recent-item__name">{record.nombres}</p>
                      <p className="recent-item__meta">
                        DNI {record.dni}
                        {record.escuela ? (
                          <>
                            <GraduationCap size={12} aria-hidden="true" />
                            {record.escuela}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="recent-item__side">
                      <span className="recent-item__time">{record.hora.slice(0, 5)}</span>
                      <SourceBadge source={record.source} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={History}
                title="Sin registros todavía"
                description="Cada escaneo aparecerá aquí al instante."
              />
            )}
          </section>
        </div>

        <div className="scan-side">
          <LastAttendee
            record={lastRecord}
            session={config.session}
            percent={percent}
            onScan={() => inputRef.current?.focus()}
            onViewAll={() => onNavigate?.('attendees')}
          />
        </div>
      </div>

      <ManualEntryModal
        open={Boolean(manual)}
        prefill={manual}
        reason={manual?.reason}
        onSubmit={submitManual}
        onClose={closeManual}
      />

      <CameraScanner
        open={cameraOpen}
        onClose={closeCamera}
        onDetected={handleCameraDetected}
      />

      <Modal
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        title="Cambiar sesión o día"
        description="Los nuevos registros se guardarán en la sesión que elijas."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSessionOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={saveSession}>
              Guardar sesión
            </Button>
          </>
        }
      >
        <form className="form-stack" onSubmit={saveSession}>
          <Field
            label="Sesión / día"
            htmlFor="scan-session"
            hint="Puedes escribir una nueva, por ejemplo: Día 2 o Taller de IA."
          >
            <input
              id="scan-session"
              className="input"
              value={sessionDraft}
              onChange={(event) => setSessionDraft(event.target.value)}
              list="scan-session-options"
              placeholder="Día 1"
              data-autofocus
            />
          </Field>
          <datalist id="scan-session-options">
            {sessions.map((session) => (
              <option key={session} value={session} />
            ))}
          </datalist>
          <button type="submit" className="sr-only">
            Guardar sesión
          </button>
        </form>
      </Modal>
    </div>
  );
}
