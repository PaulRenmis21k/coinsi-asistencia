export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`empty ${compact ? 'empty--compact' : ''}`}>
      {Icon ? (
        <span className="empty__icon" aria-hidden="true">
          <Icon size={compact ? 20 : 26} />
        </span>
      ) : null}
      <h3 className="empty__title">{title}</h3>
      {description ? <p className="empty__text">{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
