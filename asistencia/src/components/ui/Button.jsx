import { Loader2 } from 'lucide-react';

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className = '',
  type = 'button',
  children,
  ...rest
}) {
  const iconOnly = !children;
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    iconOnly ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest} disabled={rest.disabled || loading}>
      {loading ? (
        <Loader2 className="btn__spinner" size={17} aria-hidden="true" />
      ) : Icon ? (
        <Icon size={17} aria-hidden="true" />
      ) : null}
      {children ? <span>{children}</span> : null}
      {IconRight ? <IconRight size={16} aria-hidden="true" /> : null}
    </button>
  );
}
