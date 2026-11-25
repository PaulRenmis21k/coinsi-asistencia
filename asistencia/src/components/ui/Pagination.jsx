import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pageCount, onPage, total, pageSize }) {
  if (pageCount <= 1) {
    return (
      <div className="pagination pagination--single">
        <p className="pagination__info">
          {total} {total === 1 ? 'registro' : 'registros'}
        </p>
      </div>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages = [];

  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <nav className="pagination" aria-label="Paginación de resultados">
      <p className="pagination__info">
        Mostrando <strong>{from}</strong>–<strong>{to}</strong> de <strong>{total}</strong>
      </p>
      <div className="pagination__pages">
        <button
          type="button"
          className="page-btn"
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        {start > 1 ? <span className="pagination__gap">…</span> : null}
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            className={`page-btn ${number === page ? 'is-active' : ''}`}
            onClick={() => onPage(number)}
            aria-current={number === page ? 'page' : undefined}
            aria-label={`Página ${number}`}
          >
            {number}
          </button>
        ))}
        {end < pageCount ? <span className="pagination__gap">…</span> : null}
        <button
          type="button"
          className="page-btn"
          onClick={() => onPage(page + 1)}
          disabled={page === pageCount}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
