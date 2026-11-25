import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './context/AppContext.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import MobileHeader from './components/layout/MobileHeader.jsx';
import MobileNav from './components/layout/MobileNav.jsx';
import ExportModal from './components/export/ExportModal.jsx';
import Wizard from './components/onboarding/Wizard.jsx';
import ToastStack from './components/ui/ToastStack.jsx';
import ScanPage from './pages/ScanPage.jsx';
import AttendeesPage from './pages/AttendeesPage.jsx';
import PadronPage from './pages/PadronPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export const PAGES = {
  scan: 'Escanear',
  attendees: 'Asistentes',
  padron: 'Padrón',
  settings: 'Ajustes',
};

export default function App() {
  const { config, setConfig, notify } = useApp();
  const [page, setPage] = useState('scan');
  const [exportOpen, setExportOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const scanInputRef = useRef(null);

  // Primer uso guiado.
  useEffect(() => {
    if (!config.wizardDone) setWizardOpen(true);
  }, [config.wizardDone]);

  const goToScan = useCallback(() => {
    setPage('scan');
    window.setTimeout(() => scanInputRef.current?.focus(), 80);
  }, []);

  // Atajos: F2 enfoca el escáner, Ctrl/Cmd + P abre la exportación.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'F2') {
        if (wizardOpen || exportOpen) return;
        event.preventDefault();
        goToScan();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        if (wizardOpen) return;
        event.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToScan, wizardOpen, exportOpen]);

  const closeWizard = (completed) => {
    setWizardOpen(false);
    setConfig({ wizardDone: true });
    if (completed) {
      notify('Configuración lista. Ya puedes registrar asistencias.', { type: 'success' });
    }
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} onExport={() => setExportOpen(true)} />

      <div className="app-main">
        <MobileHeader />
        <main id="contenido" className="app-content">
          {page === 'scan' && (
            <ScanPage
              inputRef={scanInputRef}
              onExport={() => setExportOpen(true)}
              onNavigate={setPage}
            />
          )}
          {page === 'attendees' && (
            <AttendeesPage onExport={() => setExportOpen(true)} onNavigate={setPage} />
          )}
          {page === 'padron' && <PadronPage onNavigate={setPage} />}
          {page === 'settings' && (
            <SettingsPage onRestartWizard={() => setWizardOpen(true)} />
          )}
        </main>
      </div>

      <MobileNav page={page} onNavigate={setPage} />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <Wizard open={wizardOpen} onClose={closeWizard} />
      <ToastStack />
    </div>
  );
}
