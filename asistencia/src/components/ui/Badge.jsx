export default function Badge({ tone = 'neutral', children, dot = false, className = '' }) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const SOURCE_TONES = {
  'Padrón': 'brand',
  RENIEC: 'success',
  Manual: 'neutral',
};

export function SourceBadge({ source }) {
  return <Badge tone={SOURCE_TONES[source] || 'neutral'}>{source || 'Manual'}</Badge>;
}
