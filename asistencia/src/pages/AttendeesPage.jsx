import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Download, Search, Trash2, Users, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { PAGE_SIZE } from '../lib/constants.js';
import { initials, normalize } from '../lib/format.js';
import Button from '../components/ui/Button.jsx';
import Badge, { SourceBadge } from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

export default function AttendeesPage({ onExport, onNavigate }) {
  const { records, config, removeRecord, restoreRecord, notify } = useApp();

  const [query, setQuery] = useState('');
  const [session, setSession] = useState('all');
  const [school, setSchool] = useState('all');
  const [sort, setSort] = useState({ key: 'ts', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);

  const sessions = useMemo(
    () => [...new Set(records.map((record) => record.session))].sort((a, b) => a.localeCompare(b, 'es')),
    [records],
  );
  const schools = useMemo(
    () =>
      [...new Set(records.map((record) => record.escuela).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [records],
  );

  const filtered = useMemo(() => {
    const term = normalize(query);
    const list = records.filter((record) => {
      if (session !== 'all' && record.session !== session) return false;
      if (school !== 'all' && record.escuela !== school) return false;
      if (!term) return true;
      return (
        normalize(record.nombres).includes(term) ||
        record.dni.includes(term) ||
        normalize(record.escuela).includes(term)
      );
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sort.key === 'nombres') comparison = a.nombres.localeCompare(b.nombres, 'es');
      else if (sort.key === 'dni') comparison = a.dni.localeCompare(b.dni);
      else if (sort.key === 'escuela') {
        comparison = (a.escuela || '').localeCompare(b.escuela || '', 'es');
      } else if (sort.key === 'session') {
        comparison = a.session.localeCompare(b.session, 'es');
      } else {
        comparison = (a.ts || 0) - (b.ts || 0);
      }
      return sort.dir === 'asc' ? comparison : -comparison;
    });
  }, [records, query, session, school, sort]);

  useEffect(() => {
    setPage(1);
  }, [query, session, school]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'ts' ? 'desc' : 'asc' },
    );
  };

  const sortHeader = (label, key) => (
    <th
      scope="col"
      aria-sort={
        sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button type="button" className="th-sort" onClick={() => toggleSort(key)}>
        {label}
        <ArrowUpDown size={13} aria-hidden="true" />
      </button>
    </th>
  );

  const confirmDelete = () => {
    const removed = removeRecord(pendingDelete.id);
    setPendingDelete(null);
    if (!removed) return;
    notify(`Se eliminó el registro de ${removed.nombres}.`, {
      type: 'info',
      action: {
        label: 'Deshacer',
        onClick: () => {
          restoreRecord(removed);
          notify('Registro restaurado.', { type: 'success' });
        },
      },
    });
  };

  const clearFilters = () => {
    setQuery('');
    setSession('all');
    setSchool('all');
  };

  const hasFilters = query !== '' || session !== 'all' || school !== 'all';

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">Padrón y registros</p>
          <h1 className="page-title">Asistentes</h1>
          <p className="page-sub">
            {records.length} {records.length === 1 ? 'registro' : 'registros'} en total · Sesión{' '}
            {config.session}
          </p>
        </div>
        <div className="page-actions">
          <Button icon={Download} variant="primary" onClick={onExport}>
            Exportar
          </Button>
        </div>
      </header>

      <section className="panel" aria-labelledby="attendees-title">
        <header className="panel__head panel__head--wrap">
          <div>
            <h2 id="attendees-title" className="panel__title">
              Registro de asistentes
            </h2>
            <p className="panel__hint">
              {filtered.length} de {records.length} registros visibles
            </p>
          </div>
          <div className="panel__tools">
            <div className="search">
              <Search size={16} aria-hidden="true" />
              <label htmlFor="attendees-search" className="sr-only">
                Buscar asistentes
              </label>
              <input
                id="attendees-search"
                type="search"
                placeholder="Buscar por DNI, nombre o escuela"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <label htmlFor="attendees-session" className="sr-only">
              Filtrar por sesión
            </label>
            <select
              id="attendees-session"
              className="select"
              value={session}
              onChange={(event) => setSession(event.target.value)}
            >
              <option value="all">Todas las sesiones</option>
              {sessions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label htmlFor="attendees-school" className="sr-only">
              Filtrar por escuela
            </label>
            <select
              id="attendees-school"
              className="select"
              value={school}
              onChange={(event) => setSchool(event.target.value)}
            >
              <option value="all">Todas las escuelas</option>
              {schools.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {hasFilters ? (
              <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>
                Limpiar
              </Button>
            ) : null}
          </div>
        </header>

        {records.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aún no hay asistentes registrados"
            description="Escanea el código del DNI o usa el ingreso manual para empezar tu primer registro."
            action={
              <Button variant="primary" onClick={() => onNavigate?.('scan')}>
                Ir a escanear
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Sin coincidencias"
            description="Ningún registro coincide con la búsqueda o los filtros aplicados."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {sortHeader('DNI', 'dni')}
                    {sortHeader('Asistente', 'nombres')}
                    {sortHeader('Escuela', 'escuela')}
                    {sortHeader('Sesión', 'session')}
                    {sortHeader('Fecha y hora', 'ts')}
                    <th scope="col">Fuente</th>
                    <th scope="col">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((record) => (
                    <tr key={record.id}>
                      <td className="cell-dni">{record.dni}</td>
                      <td>
                        <div className="person">
                          <span className="avatar" aria-hidden="true">
                            {initials(record.nombres)}
                          </span>
                          <span className="person__name">{record.nombres}</span>
                        </div>
                      </td>
                      <td className="cell-muted">{record.escuela || '—'}</td>
                      <td>
                        <Badge tone="neutral">{record.session}</Badge>
                      </td>
                      <td>
                        <span className="cell-date">{record.fecha}</span>
                        <span className="cell-time">{record.hora}</span>
                      </td>
                      <td>
                        <SourceBadge source={record.source} />
                      </td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => setPendingDelete(record)}
                          aria-label={`Eliminar el registro de ${record.nombres}`}
                          title="Eliminar registro"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="attendee-cards">
              {visible.map((record) => (
                <li key={record.id} className="attendee-card">
                  <span className="avatar" aria-hidden="true">
                    {initials(record.nombres)}
                  </span>
                  <div className="attendee-card__body">
                    <p className="attendee-card__name">{record.nombres}</p>
                    <p className="attendee-card__meta">
                      DNI {record.dni} · {record.escuela || 'Sin escuela'}
                    </p>
                    <p className="attendee-card__meta">
                      {record.fecha} · {record.hora} · {record.session}
                    </p>
                  </div>
                  <div className="attendee-card__side">
                    <SourceBadge source={record.source} />
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      onClick={() => setPendingDelete(record)}
                      aria-label={`Eliminar el registro de ${record.nombres}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <Pagination
              page={currentPage}
              pageCount={pageCount}
              onPage={setPage}
              total={filtered.length}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar registro"
        description={
          pendingDelete
            ? `Se quitará la asistencia de ${pendingDelete.nombres} (DNI ${pendingDelete.dni}) de la sesión ${pendingDelete.session}. Podrás deshacerlo durante unos segundos.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
