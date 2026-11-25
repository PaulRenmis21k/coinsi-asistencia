import { ArrowUpRight, ScanLine } from 'lucide-react';
import { SourceBadge } from '../ui/Badge.jsx';
import { initials } from '../../lib/format.js';

export default function LastAttendee({
  record,
  session,
  percent = null,
  onScan,
  onViewAll,
}) {
  return (
    <section
      className={`profile ${record ? '' : 'profile--empty'}`.trim()}
      aria-label={record ? 'Último asistente registrado' : 'Sin asistentes registrados'}
    >
      <div className="profile__cover">
        <span className="profile__live">
          <span className="profile__live-dot" aria-hidden="true" />
          En vivo
        </span>
      </div>

      <div className="profile__body">
        {record ? (
          <>
            <div className="profile__avatar" aria-hidden="true">
              {initials(record.nombres)}
            </div>
            <h2 className="profile__name">{record.nombres}</h2>
            <p className="profile__role">{record.escuela || 'Asistente del congreso'}</p>

            <dl className="profile__details">
              <div>
                <dt>DNI</dt>
                <dd>{record.dni}</dd>
              </div>
              <div>
                <dt>Hora</dt>
                <dd>{record.hora}</dd>
              </div>
              <div>
                <dt>Sesión</dt>
                <dd>{record.session}</dd>
              </div>
              <div>
                <dt>Fuente</dt>
                <dd>
                  <SourceBadge source={record.source} />
                </dd>
              </div>
            </dl>

            <div className="profile__mini">
              <div className="profile__mini-card profile__mini-card--green">
                <span>Asistencia</span>
                <strong>Presente</strong>
              </div>
              <div className="profile__mini-card profile__mini-card--purple">
                <span>Avance sesión</span>
                <strong>{percent === null ? '—' : `${percent}%`}</strong>
              </div>
            </div>

            <button type="button" className="profile__cta" onClick={onViewAll}>
              Ver todos los asistentes
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <div className="profile__avatar profile__avatar--empty" aria-hidden="true">
              <ScanLine size={30} />
            </div>
            <h2 className="profile__name">Aún no hay registros</h2>
            <p className="profile__role">Sesión {session}</p>
            <p className="profile__empty-text">
              Escanea el primer DNI y aquí verás el resumen del asistente al instante.
            </p>

            <div className="profile__mini profile__mini--single">
              <div className="profile__mini-card profile__mini-card--purple">
                <span>Avance de la sesión</span>
                <strong>{percent === null ? '—' : `${percent}%`}</strong>
              </div>
            </div>

            <button type="button" className="profile__cta profile__cta--primary" onClick={onScan}>
              Escanear ahora
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
