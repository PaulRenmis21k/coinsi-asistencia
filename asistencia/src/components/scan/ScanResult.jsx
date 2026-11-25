import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import { SourceBadge } from '../ui/Badge.jsx';

const KINDS = {
  success: { icon: CheckCircle2, title: 'Registrado correctamente', tone: 'success' },
  duplicate: { icon: AlertTriangle, title: 'Ya registrado en esta sesión', tone: 'warning' },
  nodata: { icon: AlertTriangle, title: 'Sin datos para este DNI', tone: 'warning' },
  invalid: { icon: XCircle, title: 'Código inválido', tone: 'danger' },
  error: { icon: XCircle, title: 'No se pudo registrar', tone: 'danger' },
};

export default function ScanResult({ result, onDismiss }) {
  const meta = KINDS[result.kind] || KINDS.invalid;
  const Icon = meta.icon;
  const record = result.record;

  return (
    <section className={`result result--${meta.tone}`} aria-live="assertive" aria-atomic="true">
      <div className="result__head">
        <span className="result__icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <p className="result__kicker">{meta.title}</p>
        <button
          type="button"
          className="result__close"
          onClick={onDismiss}
          aria-label="Cerrar el resultado del escaneo"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {record ? (
        <>
          <p className="result__name">{record.nombres}</p>
          <div className="result__meta">
            <span className="result__dni">DNI {record.dni}</span>
            <span>{record.hora}</span>
            {record.escuela ? <span>{record.escuela}</span> : null}
            {result.kind === 'success' ? <SourceBadge source={record.source} /> : null}
          </div>
          {result.kind === 'duplicate' ? (
            <p className="result__note">
              El primer registro fue a las <strong>{record.hora}</strong> del {record.fecha}.
            </p>
          ) : null}
        </>
      ) : (
        <>
          {result.dni ? <p className="result__name">DNI {result.dni}</p> : null}
          <p className="result__note">
            {result.message ||
              'El código leído no contiene los 8 dígitos del DNI. Inténtalo otra vez.'}
          </p>
        </>
      )}
    </section>
  );
}
