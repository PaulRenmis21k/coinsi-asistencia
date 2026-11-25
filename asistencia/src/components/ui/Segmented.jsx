export default function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`segmented__item ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {Icon ? <Icon size={16} aria-hidden="true" /> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
