import { useEffect, useState } from 'react';
import FormField from './FormField.jsx';

const AUDIENCES = [
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
];

const EMPTY = { eyebrow: '', heading: '', subheading: '' };

// Editor for a page's hero copy, held separately for each audience segment —
// the visitor sees the set matching whichever way the win/award toggle is
// switched. Shared by every page whose hero is editable; the caller supplies the
// title, the description and the two API calls, so this doesn't need to know
// which page it is editing.
export default function HeroCopyEditor({ title, subtitle, load, save }) {
  const [audience, setAudience] = useState('award');
  const [copy, setCopy] = useState({ award: EMPTY, win: EMPTY });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((data) => {
        if (!alive) return;
        setCopy({
          award: { ...EMPTY, ...(data?.award || {}) },
          win: { ...EMPTY, ...(data?.win || {}) },
        });
        setStatus('ready');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = copy[audience] || EMPTY;

  const onChange = (e) => {
    const { name, value } = e.target;
    setSaved(false);
    setCopy((c) => ({ ...c, [audience]: { ...c[audience], [name]: value } }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await save(audience, form);
      setSaved(true);
    } catch (err) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">{title}</h2>
          <p className="admin-page__subtitle">{subtitle}</p>
        </div>
      </div>

      {status === 'loading' && <p className="admin-page__subtitle">Loading…</p>}
      {status === 'error' && (
        <div className="admin-alert admin-alert--error">Failed to load the hero copy.</div>
      )}

      {status === 'ready' && (
        <>
          <div className="admin-toolbar">
            <div className="admin-tabs" role="tablist" aria-label="Audience">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  role="tab"
                  aria-selected={audience === a.value}
                  className={`admin-tab${audience === a.value ? ' is-active' : ''}`}
                  onClick={() => {
                    setSaved(false);
                    setAudience(a.value);
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-card">
            <form onSubmit={onSubmit}>
              {error && <div className="admin-alert admin-alert--error">{error}</div>}

              <FormField
                label="Eyebrow"
                name="eyebrow"
                value={form.eyebrow}
                onChange={onChange}
                hint="The small line above the heading. Shown exactly as you type it."
              />
              <FormField label="Heading" name="heading" value={form.heading} onChange={onChange} />
              <FormField
                label="Sub-heading"
                name="subheading"
                as="textarea"
                rows={4}
                value={form.subheading}
                onChange={onChange}
                hint="The paragraph below the heading."
              />

              <p className="admin-field__hint" style={{ marginLeft: 0 }}>
                Clearing a field restores the wording the page was built with.
              </p>

              <div className="admin-form-actions" style={{ marginTop: 12 }}>
                <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {saved && <span className="admin-field__hint">Saved.</span>}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
