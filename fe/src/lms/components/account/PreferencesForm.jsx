// A group of on/off settings (L6). Driven by a schema so the settings page
// describes what it offers rather than repeating markup per row.
//
// Each row is a real <input type="checkbox"> behind a styled track, so it is
// focusable, toggleable with the keyboard and announced as a checkbox. A div
// with a click handler would lose all three.
export default function PreferencesForm({ fields, values, onChange }) {
  return (
    <ul className="lms-prefs">
      {fields.map((f) => (
        <li className="lms-pref" key={f.key}>
          <label className="lms-pref__label">
            <span className="lms-pref__text">
              <span className="lms-pref__name">{f.label}</span>
              {f.hint ? <span className="lms-pref__hint">{f.hint}</span> : null}
            </span>
            <input
              type="checkbox"
              className="lms-switch__input lms-sr-only"
              checked={Boolean(values[f.key])}
              onChange={(e) => onChange(f.key, e.target.checked)}
            />
            <span className="lms-switch" aria-hidden="true">
              <span className="lms-switch__knob" />
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
