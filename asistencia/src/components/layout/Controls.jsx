import { Monitor, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

const THEME_ORDER = ['auto', 'light', 'dark'];
const THEME_LABELS = { auto: 'automático', light: 'claro', dark: 'oscuro' };

export function ThemeButton() {
  const { config, setConfig } = useApp();
  const index = THEME_ORDER.indexOf(config.theme);
  const next = THEME_ORDER[(index + 1) % THEME_ORDER.length];
  const Icon = config.theme === 'auto' ? Monitor : config.theme === 'light' ? Sun : Moon;

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setConfig({ theme: next })}
      aria-label={`Cambiar tema (actual: ${THEME_LABELS[config.theme] || 'automático'})`}
      title={`Tema ${THEME_LABELS[config.theme] || 'automático'} · clic para cambiar`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export function SoundButton() {
  const { config, setConfig } = useApp();
  const enabled = config.sound;

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setConfig({ sound: !enabled })}
      aria-pressed={enabled}
      aria-label={enabled ? 'Silenciar los pitidos del escáner' : 'Activar los pitidos del escáner'}
      title={enabled ? 'Sonido activado' : 'Sonido silenciado'}
    >
      {enabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
    </button>
  );
}
