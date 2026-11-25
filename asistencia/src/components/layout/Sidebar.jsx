import { CalendarDays, ClipboardList, MapPin, ScanLine, Settings, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import BrandLogo from './BrandLogo.jsx';
import { SoundButton, ThemeButton } from './Controls.jsx';
import { formatNumber } from '../../lib/format.js';

const NAV_ITEMS = [
  { id: 'scan', label: 'Escanear', icon: ScanLine },
  { id: 'attendees', label: 'Asistentes', icon: Users },
  { id: 'padron', label: 'Padrón', icon: ClipboardList },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function Sidebar({ page, onNavigate }) {
  const { config, records, padron } = useApp();

  const sessionCount = new Set(
    records.filter((record) => record.session === config.session).map((record) => record.dni),
  ).size;
  const percent = padron.length
    ? Math.min(100, Math.round((sessionCount / padron.length) * 100))
    : null;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <BrandLogo />
      </div>

      <div className="sidebar__event">
        <span className="sidebar__event-label">Evento activo</span>
        <strong className="sidebar__event-name">{config.eventName || 'Congreso COINSI'}</strong>
        <span className="sidebar__event-meta">
          <MapPin size={13} aria-hidden="true" />
          {config.place || 'Lugar por definir'}
        </span>
        <span className="sidebar__event-meta">
          <CalendarDays size={13} aria-hidden="true" />
          Sesión: {config.session}
        </span>
      </div>

      <nav className="sidebar__nav" aria-label="Secciones principales">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${active ? 'is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="nav-item__label">{item.label}</span>
              {item.id === 'attendees' && records.length > 0 ? (
                <span className="nav-item__count">{records.length}</span>
              ) : null}
              {active ? <span className="nav-item__dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="sidebar__foot">
        <div className="sidebar__progress">
          <div className="sidebar__progress-head">
            <span>Avance del padrón</span>
            <strong>{percent === null ? '—' : `${percent}%`}</strong>
          </div>
          <div
            className="progress progress--dark"
            role="progressbar"
            aria-label="Porcentaje de asistencia de la sesión respecto al padrón"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? 0}
          >
            <span style={{ width: `${percent ?? 0}%` }} />
          </div>
          <p>
            {padron.length
              ? `${sessionCount} de ${formatNumber(padron.length)} inscritos`
              : 'Sin padrón importado'}
          </p>
        </div>

        <div className="sidebar__tools">
          <ThemeButton />
          <SoundButton />
          <span className="sidebar__tools-label">Apariencia y sonido</span>
        </div>
      </div>
    </aside>
  );
}
