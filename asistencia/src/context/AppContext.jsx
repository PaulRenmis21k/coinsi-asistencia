import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG } from '../lib/constants.js';
import { cleanName, formatDate, formatTime } from '../lib/format.js';
import { loadState, saveState } from '../lib/storage.js';

const AppContext = createContext(null);

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `r-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const EMPTY_STATE = { config: { ...DEFAULT_CONFIG }, padron: [], records: [] };

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState() ?? EMPTY_STATE);
  const [toasts, setToasts] = useState([]);
  const saveWarning = useRef(false);
  const timers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback((message, options = {}) => {
    const id = uid();
    const duration = options.duration ?? (options.action ? 8000 : 4200);
    const toast = {
      id,
      message,
      type: options.type || 'info',
      action: options.action || null,
      duration,
    };

    setToasts((list) => [...list.slice(-2), toast]);

    if (duration > 0) {
      const timer = window.setTimeout(() => {
        setToasts((list) => list.filter((item) => item.id !== id));
        timers.current.delete(id);
      }, duration);
      timers.current.set(id, timer);
    }
    return id;
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  // Persistencia tolerante a errores (modo incógnito, cuota llena, etc.).
  useEffect(() => {
    const saved = saveState(state);
    if (!saved && !saveWarning.current) {
      saveWarning.current = true;
      notify(
        'No se pudo guardar en este navegador. Revisa el espacio disponible o el modo de navegación privada.',
        { type: 'error', duration: 9000 },
      );
    }
  }, [state, notify]);

  // Tema claro / oscuro / automático.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const chosen = state.config.theme;
      const resolved = chosen === 'auto' ? (media.matches ? 'dark' : 'light') : chosen;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [state.config.theme]);

  const padronIndex = useMemo(() => {
    const map = new Map();
    state.padron.forEach((person) => map.set(person.dni, person));
    return map;
  }, [state.padron]);

  const setConfig = useCallback((patch) => {
    setState((prev) => ({ ...prev, config: { ...prev.config, ...patch } }));
  }, []);

  const addRecord = useCallback(
    ({ dni, nombres, escuela, source }) => {
      const now = new Date();
      const record = {
        id: uid(),
        dni,
        nombres: cleanName(nombres) || 'Sin nombre',
        escuela: cleanName(escuela),
        session: state.config.session,
        fecha: formatDate(now),
        hora: formatTime(now),
        ts: now.getTime(),
        source,
      };
      setState((prev) => ({ ...prev, records: [...prev.records, record] }));
      return record;
    },
    [state.config.session],
  );

  const removeRecord = useCallback(
    (id) => {
      const removed = state.records.find((record) => record.id === id) || null;
      setState((prev) => ({
        ...prev,
        records: prev.records.filter((record) => record.id !== id),
      }));
      return removed;
    },
    [state.records],
  );

  const restoreRecord = useCallback((record) => {
    setState((prev) => {
      if (prev.records.some((item) => item.id === record.id)) return prev;
      return { ...prev, records: [...prev.records, record].sort((a, b) => a.ts - b.ts) };
    });
  }, []);

  const setPadron = useCallback((entries, mode = 'replace') => {
    setState((prev) => {
      if (mode === 'merge') {
        const map = new Map(prev.padron.map((person) => [person.dni, person]));
        entries.forEach((entry) => map.set(entry.dni, { ...map.get(entry.dni), ...entry }));
        return { ...prev, padron: [...map.values()] };
      }
      return { ...prev, padron: entries };
    });
  }, []);

  const removePadronEntry = useCallback((dni) => {
    setState((prev) => ({ ...prev, padron: prev.padron.filter((person) => person.dni !== dni) }));
  }, []);

  const clearPadron = useCallback(() => {
    setState((prev) => ({ ...prev, padron: [] }));
  }, []);

  const replaceData = useCallback((next) => setState(next), []);

  const resetAll = useCallback(() => {
    setState({
      config: {
        ...DEFAULT_CONFIG,
        theme: state.config.theme,
        sound: state.config.sound,
      },
      padron: [],
      records: [],
    });
  }, [state.config.theme, state.config.sound]);

  const value = useMemo(
    () => ({
      config: state.config,
      padron: state.padron,
      records: state.records,
      padronIndex,
      setConfig,
      addRecord,
      removeRecord,
      restoreRecord,
      setPadron,
      removePadronEntry,
      clearPadron,
      replaceData,
      resetAll,
      toasts,
      notify,
      dismissToast,
    }),
    [
      state.config,
      state.padron,
      state.records,
      padronIndex,
      setConfig,
      addRecord,
      removeRecord,
      restoreRecord,
      setPadron,
      removePadronEntry,
      clearPadron,
      replaceData,
      resetAll,
      toasts,
      notify,
      dismissToast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
}

export function useAppState() {
  return useApp();
}
