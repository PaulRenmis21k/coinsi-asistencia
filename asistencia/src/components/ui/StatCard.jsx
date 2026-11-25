export default function StatCard({ icon: Icon, label, value, hint, tone = 'brand', className = '', children }) {
  return (
    <article className={`stat stat--${tone} ${className}`.trim()}>
      <div className="stat__main">
        {Icon ? (
          <span className="stat__icon" aria-hidden="true">
            <Icon size={20} />
          </span>
        ) : null}
        <div className="stat__content">
          <span className="stat__label">{label}</span>
          <p className="stat__value">{value}</p>
        </div>
      </div>
      {hint ? <p className="stat__hint">{hint}</p> : null}
      {children ? <div className="stat__foot">{children}</div> : null}
    </article>
  );
}
