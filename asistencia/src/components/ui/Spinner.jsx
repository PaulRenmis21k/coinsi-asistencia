export default function Spinner({ size = 18, label = 'Cargando' }) {
  return (
    <span className="spinner" role="status" aria-label={label}>
      <span className="spinner__ring" style={{ width: size, height: size }} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
