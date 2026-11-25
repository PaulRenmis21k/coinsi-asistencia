// Constantes compartidas por toda la aplicación.
export const STORAGE_KEY = 'coinsi.asistencia.v1';
export const PAGE_SIZE = 10;
export const PADRON_PAGE_SIZE = 12;
export const RESULT_DURATION = 3000;

export const SOURCES = Object.freeze({
  PADRON: 'Padrón',
  RENIEC: 'RENIEC',
  MANUAL: 'Manual',
});

// API del proyecto: Vite la redirige al Express local y Vercel la sirve como función serverless.
export const LOCAL_API_URL = '/api/buscar/dni/{dni}';

export const DEFAULT_CONFIG = Object.freeze({
  eventName: 'Congreso COINSI',
  place: 'Lima, Perú',
  session: 'Día 1',
  apiUrl: LOCAL_API_URL,
  apiToken: '',
  sound: true,
  theme: 'auto',
  wizardDone: false,
});

export const THEME_OPTIONS = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export const SUGGESTED_API_URL = 'https://api.apis.net.pe/v2/reniec/dni?numero={dni}';
