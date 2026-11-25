import { useEffect, useRef, useState } from 'react';
import { CameraOff, RefreshCw } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { extractDni } from '../../lib/format.js';

/**
 * El DNI peruano lleva dos códigos en el reverso:
 * - Code 39 lineal en el borde derecho, con el número de DNI.
 * - PDF417 en la zona inferior, con la información biométrica.
 * ZXing lee ambos sin depender de BarcodeDetector (ausente en Chrome de escritorio).
 */
const FORMATS = ['PDF_417', 'CODE_39', 'CODE_128', 'QR_CODE'];

function describeCameraError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'No se permitió el uso de la cámara. Habilítala en el candado de la barra de direcciones y vuelve a intentar.';
    case 'NotFoundError':
      return 'No se encontró ninguna cámara conectada a este equipo.';
    case 'NotReadableError':
      return 'La cámara está siendo usada por otra aplicación. Ciérrala y vuelve a intentar.';
    case 'OverconstrainedError':
      return 'La cámara no admite la configuración solicitada. Prueba con otra cámara.';
    default:
      return error?.message || 'No se pudo iniciar la cámara.';
  }
}

export default function CameraScanner({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    let controls = null;
    let handled = false;

    setError('');
    setReady(false);
    setHint('');

    const start = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError(
          'Este navegador no permite abrir la cámara desde esta dirección. Usa Chrome o Edge en http://localhost, o abre la app con HTTPS.',
        );
        return;
      }

      if (window.isSecureContext === false) {
        setError(
          'La cámara solo funciona en HTTPS o en localhost. Abre la app desde http://localhost:5174 o configura HTTPS.',
        );
        return;
      }

      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all(
          [import('@zxing/browser'), import('@zxing/library')],
        );

        if (cancelled) return;

        const hints = new Map();
        hints.set(
          DecodeHintType.POSSIBLE_FORMATS,
          FORMATS.map((format) => BarcodeFormat[format]).filter(Boolean),
        );
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');

        const reader = new BrowserMultiFormatReader(hints);
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          videoRef.current,
          (result, _scanError, scanControls) => {
            if (cancelled || handled || !result) return;

            const raw = result.getText();
            const format = result.getBarcodeFormat?.();
            const isPdf417 = format === BarcodeFormat.PDF_417;
            const cleaned = raw.replace(/[\s*]/g, '');
            const labeled = raw.match(/\b(?:DNI|DOCUMENTO|DOC)\b[^0-9]{0,8}(\d{8})/i);

            // El PDF417 del DNI peruano guarda la huella biométrica. Si no trae
            // un número limpio, se ignora para no registrar un DNI equivocado.
            let dni = '';
            if (/^\d{8,9}$/.test(cleaned)) {
              dni = cleaned.slice(0, 8);
            } else if (labeled) {
              dni = labeled[1];
            } else if (!isPdf417) {
              dni = extractDni(raw);
            }

            if (!dni) {
              setHint(
                isPdf417
                  ? 'PDF417 leído, pero no contiene el número legible. Usa el Code 39 del borde derecho del reverso.'
                  : 'Se leyó un código, pero no contiene un DNI de 8 dígitos. Acércalo un poco más.',
              );
              return;
            }

            handled = true;
            scanControls?.stop?.();
            onDetected(dni);
            onClose();
          },
        );

        if (cancelled) {
          controls?.stop?.();
          return;
        }

        setReady(true);
      } catch (err) {
        if (cancelled) return;
        // Si el stream llegó a abrirse antes del error, apaga la cámara.
        const video = videoRef.current;
        video?.srcObject?.getTracks?.().forEach((track) => track.stop());
        if (video) video.srcObject = null;
        setError(describeCameraError(err));
      }
    };

    start();

    return () => {
      cancelled = true;
      controls?.stop?.();
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [open, attempt, onDetected, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Escanear el DNI con la cámara"
      description="Coloca el reverso del DNI frente a la cámara. El número se lee del código de barras y la asistencia se registra automáticamente."
      size="md"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className={`camera ${ready ? 'is-ready' : ''}`}>
        <video
          ref={videoRef}
          className="camera__video"
          muted
          autoPlay
          playsInline
          aria-label="Vista de la cámara para leer el código del DNI"
        />
        <div className="camera__frame" aria-hidden="true" />
        {!ready && !error ? (
          <p className="camera__status">
            <Spinner size={18} label="Iniciando cámara" /> Iniciando cámara…
          </p>
        ) : null}
        {ready && !error ? (
          <p className="camera__hint" role="status">
            {hint || 'Buscando el código del DNI…'}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="camera__error">
          <p className="inline-note inline-note--warning" role="alert">
            <CameraOff size={16} aria-hidden="true" />
            <span>{error}</span>
          </p>
          <div>
            <Button icon={RefreshCw} onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : null}

      <ul className="camera__tips">
        <li>
          <strong>Code 39:</strong> barra lineal vertical en el borde derecho del reverso. Es la
          lectura más rápida.
        </li>
        <li>
          <strong>PDF417:</strong> recuadro denso en la parte inferior del reverso. También se admite.
        </li>
        <li>Buena luz, sin reflejos y el código completo dentro del recuadro. Si está vertical, gira el DNI.</li>
      </ul>

      <p className="field__hint">
        La imagen se procesa en este dispositivo y no se graba ni se envía. La cámara requiere Chrome
        o Edge y funciona en localhost o HTTPS.
      </p>
    </Modal>
  );
}
