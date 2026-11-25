export default function Switch({ id, checked, onChange, label, description }) {
  return (
    <div className="switch-row">
      <div className="switch-row__text">
        <span className="switch-row__label" id={`${id}-label`}>
          {label}
        </span>
        {description ? <span className="switch-row__desc">{description}</span> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
