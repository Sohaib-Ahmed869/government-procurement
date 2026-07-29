import { useEffect, useMemo, useRef, useState } from 'react';
import { FaMagnifyingGlass, FaChevronDown, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { rulesApi } from '../../../api';
import { STATES, CATEGORIES, CATEGORY_BY_VALUE } from '../data.js';
import './JurisdictionsList.css';

const ALL_CATEGORIES = { value: 'all', label: 'All categories' };

// Custom listbox rather than a native <select>: the OS draws the native popup,
// so it can't take the rounded, themed treatment used across the site.
function CategorySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const options = [ALL_CATEGORIES, ...CATEGORIES];

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? ALL_CATEGORIES;

  return (
    <div className="jl-select" ref={ref}>
      <button
        type="button"
        id="jl-category"
        className="jl-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current.label}
        <FaChevronDown className={`jl-select__chevron${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <ul className="jl-select__menu" role="listbox" aria-labelledby="jl-category">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`jl-select__option${o.value === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JurisdictionsList() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  const [state, setState] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  // Rules come from the CMS (Content → Rules), ordered there.
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await rulesApi.list();
        if (!alive) return;
        setRules(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (state !== 'all' && rule.state !== state) return false;
      if (category !== 'all' && rule.category !== category) return false;
      if (!needle) return true;
      return (
        (rule.title || '').toLowerCase().includes(needle) ||
        (rule.body || '').toLowerCase().includes(needle)
      );
    });
  }, [rules, state, category, query]);

  const filtered = state !== 'all' || category !== 'all' || query.trim();

  const reset = () => {
    setState('all');
    setCategory('all');
    setQuery('');
  };

  return (
    <section
      ref={ref}
      className={`jl${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="jl__inner">
        {/* --- filters --- */}
        <div className="jl__filters">
          <div className="jl__states" role="group" aria-label="Filter by state">
            <button
              type="button"
              className={`jl__pill${state === 'all' ? ' is-active' : ''}`}
              onClick={() => setState('all')}
            >
              All states
            </button>
            {STATES.map((s) => (
              <button
                key={s}
                type="button"
                className={`jl__pill${state === s ? ' is-active' : ''}`}
                onClick={() => setState(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="jl__row">
            <CategorySelect value={category} onChange={setCategory} />

            <div className="jl__search">
              <FaMagnifyingGlass className="jl__search-icon" aria-hidden="true" />
              <input
                className="jl__search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rules…"
                aria-label="Search rules"
              />
            </div>

            <p className="jl__count">
              {visible.length} {visible.length === 1 ? 'rule' : 'rules'} shown
            </p>
            {filtered && (
              <button type="button" className="jl__reset" onClick={reset}>
                Reset filters
              </button>
            )}
          </div>
        </div>

        {status === 'loading' && <p className="jl__empty">Loading rules…</p>}
        {status === 'error' && (
          <p className="jl__empty">
            We couldn&apos;t load the rules right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && rules.length === 0 && (
          <p className="jl__empty">No rules have been published yet.</p>
        )}

        {status === 'ready' && rules.length > 0 && visible.length === 0 ? (
          <p className="jl__empty">No rules match those filters.</p>
        ) : (
          <ul className="jl__grid">
            {visible.map((rule, i) => {
              const meta = CATEGORY_BY_VALUE[rule.category];
              const Icon = meta?.Icon;
              return (
                <li className="jl-card" key={rule._id || rule.id} style={{ '--i': i }}>
                  <div className="jl-card__head">
                    <span className="jl-card__state">{rule.state}</span>
                    <span className="jl-card__category">
                      {Icon && <Icon aria-hidden="true" />}
                      {meta?.label}
                    </span>
                  </div>

                  <h2 className="jl-card__title">{rule.title}</h2>
                  {rule.threshold && (
                    <span className="jl-card__threshold">{rule.threshold}</span>
                  )}
                  <p className="jl-card__body">{rule.body}</p>

                  {/* Only rules with a source link get a Read more action. */}
                  {rule.sourceUrl && (
                    <a
                      className="jl-card__more"
                      href={rule.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read more
                      <span className="jl-card__more-icon" aria-hidden="true">
                        <FaArrowUpRightFromSquare />
                      </span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
