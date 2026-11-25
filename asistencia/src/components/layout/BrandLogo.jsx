export default function BrandLogo({ compact = false }) {
  return (
    <div className="brand">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
          <path
            d="M21.5 10.2a7.6 7.6 0 1 0 0 11.6"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <circle cx="23.2" cy="16" r="1.7" fill="currentColor" />
        </svg>
      </span>
      <span className="brand__text">
        <strong>COINSI</strong>
        {!compact ? <span>Control de asistencia</span> : null}
      </span>
    </div>
  );
}
