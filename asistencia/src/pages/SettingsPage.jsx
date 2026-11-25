import { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileJson,
  KeyRound,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Upload,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { LOCAL_API_URL, SUGGESTED_API_URL } from '../lib/constants.js';
import { extractDni, isoDate } from '../lib/format.js';
import { lookupReniec } from '../lib/reniec.js';
import { createBackup, parseBackup } from '../lib/storage.js';
import { downloadText } from '../lib/download.js';
import Button from '../components/ui/Button.jsx';
import Field from '../components/ui/Field.jsx';
import Switch from '../components/ui/Switch.jsx';
import Segmented from '../components/ui/Segmented.jsx';
import Modal from '../components/ui/Modal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

function SettingsCard({ icon: Icon, title, hint, wide = false, danger = false, children }) {
  return (
    <section
      className={`panel settings-card ${wide ? 'settings-card--wide' : ''} ${
        danger ? 'settings-card--danger' : ''
      }`}
    >
      <header className="settings-card__head">
        <span className="settings-card__icon" aria-hidden="true">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="panel__title">{title}</h2>
          {hint ? <p className="panel__hint">{hint}</p> : null}
        </div>
      </header>
      <div className="settings-card__body">{children}</div>
    </section>
  );
}

export default function SettingsPage({ onRestartWizard }) {
  const { config, setConfig, records, padron, replaceData, resetAll, notify } = useApp();

  const [showToken, setShowToken] = useState(false);
  const [testDni, setTestDni] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetText, setResetText] = useState('');
  const [resetChecked, setResetChecked] = useState(false);

  const restoreRef = useRef(null);

  const sessions = [...new Set([config.session, ...records.map((record) => record.session)])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));

  const runTest = async () => {
    const dni = extractDni(testDni);
    if (!dni) {
      setTestResult({ ok: false, message: 'Escribe un DNI de prueba de 8 dígitos.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const data = await lookupReniec(dni, config);
      setTestResult({ ok: true, message: `Conexión correcta: ${data.nombres}` });
    } catch (error) {
      setTestResult({ ok: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const downloadBackup = () => {
    const data = createBackup({ config, padron, records });
    downloadText(
      JSON.stringify(data, null, 2),
      `respaldo_COINSI_${isoDate()}.json`,
      'application/json',
    );
    notify('Copia de seguridad descargada.', { type: 'success' });
  };

  const onRestoreFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      setPendingRestore(parseBackup(text));
    } catch (error) {
      notify(error.message, { type: 'error' });
    }
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    const restored = pendingRestore;
    replaceData(restored);
    setPendingRestore(null);
    notify(
      `Respaldo restaurado: ${restored.records.length} registros y ${restored.padron.length} inscritos.`,
      { type: 'success' },
    );
  };

  const canReset = resetChecked && resetText.trim().toUpperCase() === 'BORRAR';

  const doReset = () => {
    resetAll();
    setConfirmReset(false);
    setResetText('');
    setResetChecked(false);
    notify('Se borraron todos los datos guardados en este navegador.', { type: 'success' });
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">Configuración</p>
          <h1 className="page-title">Ajustes</h1>
          <p className="page-sub">
            Personaliza el evento, el lector y la conexión con RENIEC. Todo se guarda solo en este
            navegador.
          </p>
        </div>
        <div className="page-actions">
          <Button icon={RotateCcw} onClick={onRestartWizard}>
            Ver guía de inicio
          </Button>
        </div>
      </header>

      <div className="settings-grid">
        <SettingsCard
          icon={SlidersHorizontal}
          title="Evento"
          hint="Estos datos aparecen en la pantalla y en los reportes."
          wide
        >
          <div className="form-grid">
            <Field label="Nombre del evento" htmlFor="config-event">
              <input
                id="config-event"
                className="input"
                value={config.eventName}
                onChange={(event) => setConfig({ eventName: event.target.value })}
                placeholder="Congreso COINSI"
              />
            </Field>
            <Field label="Lugar" htmlFor="config-place">
              <input
                id="config-place"
                className="input"
                value={config.place}
                onChange={(event) => setConfig({ place: event.target.value })}
                placeholder="Lima, Perú"
              />
            </Field>
            <Field
              label="Sesión / día activo"
              htmlFor="config-session"
              hint="Los nuevos escaneos se guardan en esta sesión."
            >
              <input
                id="config-session"
                className="input"
                value={config.session}
                onChange={(event) => setConfig({ session: event.target.value })}
                list="config-session-options"
                placeholder="Día 1"
              />
              <datalist id="config-session-options">
                {sessions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
          </div>
          <p className="helper-text">Los cambios se guardan automáticamente en este dispositivo.</p>
        </SettingsCard>

        <SettingsCard icon={Volume2} title="Lector y sonido" hint="Escáner USB o Bluetooth en modo teclado.">
          <Switch
            id="config-sound"
            checked={config.sound}
            onChange={(checked) => setConfig({ sound: checked })}
            label="Pitidos de confirmación"
            description="Un tono distinto para cada resultado del escaneo."
          />
          <ul className="shortcut-list">
            <li>
              <span>Enfocar el escáner</span>
              <kbd>F2</kbd>
            </li>
            <li>
              <span>Abrir exportación</span>
              <kbd>Ctrl</kbd> + <kbd>P</kbd>
            </li>
            <li>
              <span>Enviar lectura</span>
              <kbd>Enter</kbd>
            </li>
          </ul>
          <p className="helper-text">
            El campo de escaneo recupera el foco automáticamente. También puedes usar la cámara del
            equipo para leer el Code 39 o el PDF417 del reverso del DNI; la imagen se procesa en el
            dispositivo.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={KeyRound}
          title="Consulta RENIEC"
          hint="Usa un proveedor autorizado y tu propio token."
          wide
        >
          <div className="form-grid">
            <Field
              label="URL de la API"
              htmlFor="config-api-url"
              hint="Incluye el marcador {dni}. Si la dejas vacía se usa la API del proyecto, igual en local y en Vercel."
            >
              <input
                id="config-api-url"
                className="input"
                value={config.apiUrl}
                onChange={(event) => setConfig({ apiUrl: event.target.value })}
                placeholder={SUGGESTED_API_URL}
                spellCheck={false}
              />
              <div className="field__actions">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfig({ apiUrl: LOCAL_API_URL })}
                >
                  Usar la API del proyecto
                </Button>
              </div>
            </Field>
            <Field
              label="Token Bearer"
              htmlFor="config-api-token"
              hint="Déjalo vacío si usas la API del proyecto. Se guarda solo en este navegador y nunca se comparte."
            >
              <div className="input-group">
                <input
                  id="config-api-token"
                  className="input"
                  type={showToken ? 'text' : 'password'}
                  value={config.apiToken}
                  onChange={(event) => setConfig({ apiToken: event.target.value })}
                  placeholder="Tu token del proveedor"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowToken((prev) => !prev)}
                  aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
                  title={showToken ? 'Ocultar token' : 'Mostrar token'}
                >
                  {showToken ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </Field>
          </div>

          <div className="api-test">
            <Field label="Probar conexión" htmlFor="config-test-dni" hint="Usa un DNI de prueba autorizado.">
              <div className="input-group">
                <input
                  id="config-test-dni"
                  className="input input--mono"
                  value={testDni}
                  onChange={(event) => setTestDni(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="00000000"
                  inputMode="numeric"
                />
                <Button onClick={runTest} loading={testing}>
                  Probar
                </Button>
              </div>
            </Field>
            {testResult ? (
              <p
                className={`inline-note ${
                  testResult.ok ? 'inline-note--success' : 'inline-note--warning'
                }`}
                role="status"
              >
                {testResult.ok ? (
                  <CheckCircle2 size={16} aria-hidden="true" />
                ) : (
                  <KeyRound size={16} aria-hidden="true" />
                )}
                <span>{testResult.message}</span>
              </p>
            ) : null}
          </div>

          <p className="helper-text">
            La API del proyecto consulta <strong>https://api.reniec.cloud/dni/</strong> sin token.
            En local se inicia con <strong>npm start</strong> y Vite redirige <strong>/api</strong>; en
            Vercel se ejecuta como función serverless. Si falla, el sistema pedirá el nombre
            manualmente y lo registrará con fuente <strong>Manual</strong>, sin bloquear el registro.
          </p>
        </SettingsCard>

        <SettingsCard icon={Sun} title="Apariencia" hint="El tema automático sigue al sistema.">
          <Segmented
            options={[
              { value: 'auto', label: 'Automático', icon: Monitor },
              { value: 'light', label: 'Claro', icon: Sun },
              { value: 'dark', label: 'Oscuro', icon: Moon },
            ]}
            value={config.theme}
            onChange={(value) => setConfig({ theme: value })}
            ariaLabel="Tema de la interfaz"
          />
          <p className="helper-text">
            Los contrastes cumplen con una lectura cómoda y el foco del teclado siempre es visible.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={FileJson}
          title="Datos y respaldo"
          hint="Descarga una copia completa o restaura un archivo anterior."
          wide
        >
          <div className="backup-actions">
            <Button icon={Download} variant="primary" onClick={downloadBackup}>
              Descargar respaldo JSON
            </Button>
            <Button icon={Upload} onClick={() => restoreRef.current?.click()}>
              Restaurar respaldo
            </Button>
            <input
              ref={restoreRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={onRestoreFile}
              tabIndex={-1}
            />
            <span className="helper-text">
              Incluye ajustes, padrón y {records.length} registros de asistencia.
            </span>
          </div>

          <div className="danger-zone">
            <p className="danger-zone__title">Zona de riesgo</p>
            <p className="helper-text">
              Borra todos los registros, el padrón y la configuración de este navegador. No se puede
              deshacer.
            </p>
            <div>
              <Button
                variant="danger"
                icon={RotateCcw}
                onClick={() => {
                  setResetText('');
                  setResetChecked(false);
                  setConfirmReset(true);
                }}
              >
                Borrar todos los datos
              </Button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="Privacidad" hint="Ley 29733 de Protección de Datos Personales.">
          <p className="helper-text">
            Los DNI, nombres y asistencias se guardan únicamente en el almacenamiento local de este
            navegador. No se envían a nuestros servidores.
          </p>
          <p className="helper-text">
            La consulta a RENIEC se realiza solo cuando tú configuras un proveedor autorizado, y viaja
            directamente a ese proveedor. Usa la información únicamente para fines del congreso,
            informa a los asistentes y elimina los datos cuando termine el evento.
          </p>
          <p className="helper-text">
            La lectura con cámara se procesa localmente en el navegador: el video no se graba ni se
            envía a ningún servidor.
          </p>
          <p className="helper-text">
            Puedes ejercer los derechos de acceso, rectificación y supresión borrando los datos desde
            esta misma pantalla o restaurando un respaldo anterior.
          </p>
        </SettingsCard>

        <SettingsCard icon={CheckCircle2} title="Guía rápida" hint="Cinco pasos para dejar todo listo.">
          <ol className="guide-list">
            <li>Define el nombre del evento, el lugar y la sesión activa.</li>
            <li>Importa el padrón CSV en la pestaña Padrón (DNI, Nombres, Escuela).</li>
            <li>Configura la URL y el token de RENIEC si quieres autocompletar nombres.</li>
            <li>Escanea el código del DNI con el lector USB/Bluetooth o con la cámara.</li>
            <li>Exporta el PDF o CSV y descarga un respaldo al cerrar cada jornada.</li>
          </ol>
          <Button variant="secondary" icon={RotateCcw} onClick={onRestartWizard}>
            Volver a ver el asistente
          </Button>
        </SettingsCard>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        title="Restaurar respaldo"
        description={
          pendingRestore
            ? `Se reemplazarán los datos actuales por ${pendingRestore.records.length} registros y ${pendingRestore.padron.length} inscritos del respaldo.`
            : ''
        }
        confirmLabel="Restaurar datos"
        onConfirm={confirmRestore}
        onClose={() => setPendingRestore(null)}
      />

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Borrar todos los datos"
        description="Esta acción elimina registros, padrón y ajustes de este navegador."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={doReset} disabled={!canReset}>
              Borrar definitivamente
            </Button>
          </>
        }
      >
        <label className="checkbox-row" htmlFor="reset-check">
          <input
            id="reset-check"
            type="checkbox"
            checked={resetChecked}
            onChange={(event) => setResetChecked(event.target.checked)}
          />
          <span>
            Entiendo que se borrarán {records.length} registros y {padron.length} inscritos, y que no
            podré recuperarlos sin un respaldo.
          </span>
        </label>

        <div className="form-stack" style={{ marginTop: '14px' }}>
          <Field
            label="Escribe BORRAR para confirmar"
            htmlFor="reset-text"
            hint="La confirmación evita borrados accidentales."
          >
            <input
              id="reset-text"
              className="input"
              value={resetText}
              onChange={(event) => setResetText(event.target.value)}
              placeholder="BORRAR"
              autoComplete="off"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
