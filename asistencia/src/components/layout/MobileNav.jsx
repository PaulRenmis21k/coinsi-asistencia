import { ClipboardList, ScanLine, Settings, Users } from 'lucide-react';

const ITEMS = [
  { id: 'scan', label: 'Escanear', icon: ScanLine },
  { id: 'attendees', label: 'Asistentes', icon: Users },
  { id: 'padron', label: 'Padrón', icon: ClipboardList },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function MobileNav({ page, onNavigate }) {
  return (
    <nav className="mobile-nav" aria-label="Secciones principales">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = page === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav__item ${active ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
