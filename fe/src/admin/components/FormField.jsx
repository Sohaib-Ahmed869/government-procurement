// A labelled form control. Renders an input, textarea, or select based on
// `as`/`type`, with an optional hint and inline error message.
export default function FormField({
  label,
  name,
  as = 'input',
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required,
  options,
  children,
  ...rest
}) {
  const id = `f-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  const common = {
    id,
    name,
    value: value ?? '',
    onChange,
    required,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': errorId,
  };

  return (
    <div className={`admin-field${error ? ' admin-field--invalid' : ''}`}>
      {label && (
        <label className="admin-field__label" htmlFor={id}>
          {label}
          {required && <span className="admin-field__req" aria-hidden="true">*</span>}
          {hint && <span className="admin-field__hint">{hint}</span>}
        </label>
      )}

      {as === 'textarea' && <textarea className="admin-textarea" {...common} {...rest} />}

      {as === 'select' && (
        <select className="admin-select" {...common} {...rest}>
          {children ||
            (options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      )}

      {as === 'input' && <input className="admin-input" type={type} {...common} {...rest} />}

      {error && (
        <p className="admin-field__error" id={errorId} role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
