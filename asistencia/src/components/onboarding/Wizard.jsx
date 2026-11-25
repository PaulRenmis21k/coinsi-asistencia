import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, FileUp, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { LOCAL_API_URL, SUGGESTED_API_URL } from '../../lib/constants.js';
import { importPadronCsv } from '../../lib/csv.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Field from '../ui/Field.jsx';

const STEPS = ['Evento', 'Padrón', 'RENIEC'];

export default function Wizard({ open, onClose }) {
  const { config, setConfig, setPadron, notify } = useApp();

  const [step, setStep] = useState(0);
  const [eventName, setEventName] = useState(config.eventName);
  const [place, setPlace] = useState(config.place);
  const [apiUrl, setApiUrl] = useState(config.apiUrl || LOCAL_API_URL);
  const [apiToken, setApiToken] = useState(config.apiToken);
  const [csvText, setCsvText] = useState('');
  const [pendingPadron, setPendingPadron] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importError, setImportError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setEventName(config.eventName || '');
    setPlace(config.place || '');
    setApiUrl(config.apiUrl || LOCAL_API_URL);
    setApiToken(config.apiToken || '');
    setCsvText('');
    setPendingPadron([]);
    setFileName('');
    setImportError('');
    // Solo se reinicia al abrir el asistente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyCsv = (text, label) => {
    const { entries, errors } = importPadronCsv(text);
    if (!entries.length) {
      setImportError(errors[0] || 'No se encontraron DNIs válidos en el archivo.');
      setPendingPadron([]);
      return;
    }
    setPendingPadron(entries);
    setImportError(errors.length ? `${errors.length} filas se omitieron por DNI inválido.` : '');
    setFileName(label || 'datos pegados');
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      applyCsv(text, file.name);
    } catch (error) {
      setImportError(`No se pudo leer el archivo: ${error.message}`);
    }
  };

  const finish = () => {
    const token = apiToken.trim();
    const url = apiUrl.trim() || (token ? SUGGESTED_API_URL : '');

    // Si el usuario pegó el CSV y no llegó a desenfocar el campo, se procesa aquí.
    let entries = pendingPadron;
    if (!entries.length && csvText.trim()) {
      entries = importPadronCsv(csvText).entries;
    }

    setConfig({
      eventName: eventName.trim() || 'Congreso COINSI',
      place: place.trim(),
      apiUrl: url,
      apiToken: token,
    });
    if (entries.length) {
      setPadron(entries, 'replace');
      notify(`${entries.length} inscritos importados al padrón.`, { type: 'success' });
    }
    onClose(true);
  };

  const canContinue = step === 1 || eventName.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={() => onClose(false)}
      title="Configura tu evento en 3 pasos"
      description="Puedes cambiar todo después desde Ajustes."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onClose(false)}>
            Configurar después
          </Button>
          <div className="wizard__nav">
            {step > 0 ? (
              <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep((prev) => prev - 1)}>
                Atrás
              </Button>
            ) : null}
            {step < 2 ? (
              <Button
                variant="primary"
                iconRight={ChevronRight}
                onClick={() => setStep((prev) => prev + 1)}
                disabled={!canContinue}
              >
                Continuar
              </Button>
            ) : (
              <Button variant="primary" icon={Check} onClick={finish}>
                Empezar a escanear
              </Button>
            )}
          </div>
        </>
      }
    >
      <ol className="wizard-steps">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`wizard-step ${index === step ? 'is-current' : ''} ${
              index < step ? 'is-done' : ''
            }`}
          >
            <span className="wizard-step__dot">
              {index < step ? <Check size={13} aria-hidden="true" /> : index + 1}
            </span>
            <span className="wizard-step__label">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="wizard-pane">
          <Field label="Nombre del evento" htmlFor="wizard-event">
            <input
              id="wizard-event"
              className="input"
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              placeholder="Congreso COINSI 2026"
              data-autofocus
            />
          </Field>
          <Field label="Lugar" htmlFor="wizard-place" hint="Aparecerá en el encabezado de los reportes.">
            <input
              id="wizard-place"
              className="input"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Lima, Perú"
            />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="wizard-pane">
          <p className="helper-text">
            Importa la lista de inscritos para validar asistencias y calcular el avance. El CSV debe
            incluir DNI, Nombres y Escuela.
          </p>

          <div className="wizard-upload">
            <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>
              Elegir archivo CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              onChange={onFile}
              tabIndex={-1}
            />
            {pendingPadron.length ? (
              <span className="wizard-upload__ok">
                <Check size={15} aria-hidden="true" />
                {pendingPadron.length} inscritos · {fileName}
              </span>
            ) : (
              <span className="helper-text">También puedes pegar el contenido abajo.</span>
            )}
          </div>

          <Field label="Pegar CSV" htmlFor="wizard-csv" optional>
            <textarea
              id="wizard-csv"
              className="textarea"
              rows={5}
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              onBlur={() => {
                if (csvText.trim()) applyCsv(csvText, 'texto pegado');
              }}
              placeholder={'DNI,Nombres,Escuela\n70123456,PÉREZ GÓMEZ MARÍA,Ingeniería de Sistemas'}
            />
          </Field>

          {importError ? (
            <p className="inline-note inline-note--warning" role="status">
              <FileUp size={16} aria-hidden="true" />
              <span>{importError}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="wizard-pane">
          <p className="helper-text">
            Viene precargada la API del proyecto, que consulta api.reniec.cloud y no necesita token.
            Funciona en local con el backend Express y en Vercel como función serverless. Si usas
            otro proveedor autorizado, cambia la URL y pega tu token.
          </p>
          <Field
            label="URL de la API de RENIEC"
            htmlFor="wizard-api"
            hint="Debe incluir el marcador {dni}."
          >
            <input
              id="wizard-api"
              className="input"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={SUGGESTED_API_URL}
              spellCheck={false}
            />
          </Field>
          <Field label="Token Bearer" htmlFor="wizard-token" optional>
            <input
              id="wizard-token"
              className="input"
              type="password"
              value={apiToken}
              onChange={(event) => setApiToken(event.target.value)}
              placeholder="Tu token del proveedor autorizado"
              autoComplete="off"
            />
          </Field>
          <p className="inline-note inline-note--success">
            <Check size={16} aria-hidden="true" />
            <span>
              Listo. Podrás escanear con el lector USB, registrar manualmente y exportar reportes en
              PDF o CSV.
            </span>
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
