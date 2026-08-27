import { useEffect, useMemo, useRef, useState } from 'react';
import { FaMagnifyingGlass, FaChevronDown, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useFadeSwap } from '../../../hooks/useFadeSwap.js';
import { useInView } from '../../../hooks/useInView.js';
import { rulesApi } from '../../../api';
import {
  JURISDICTIONS,
  JURISDICTION_BY_VALUE,
  CATEGORIES,
  CATEGORY_BY_VALUE,
} from '../data.js';
import './JurisdictionsList.css';

const ALL_CATEGORIES = { value: 'all', label: 'All categories' };
const ALL_JURISDICTIONS = { value: 'all', label: 'All jurisdictions' };

// Custom listbox rather than a native <select>: the OS draws the native popup,
// so it can't take the rounded, themed treatment used across the site.
//
// Shared by both filters. The jurisdictions are full names rather than the
// abbreviations they used to be, which is far too much text for a row of pills
// — so they live in a dropdown of their own beside the categories.
function FilterSelect({ id, label, value, options, onChange, wide = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className={`jl-select${wide ? ' jl-select--wide' : ''}`} ref={ref}>
      <button
        type="button"
        id={id}
        className="jl-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {current.label}
        <FaChevronDown className={`jl-select__chevron${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <ul className="jl-select__menu" role="listbox" aria-labelledby={id}>
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
  const { ref, inView } = useInView();

  const [state, setState] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  // What the CARDS are filtered by, a fade-out behind the controls — the same
  // hook and the same movement the Prompt Library's filters use
  // (hooks/useFadeSwap.js). The two dropdowns only: the search field filters as
  // it is typed, and a 380ms fade on every keystroke would be a stutter, not a
  // transition. The controls themselves read the live values, so a dropdown
  // answers the selection straight away while the grid it replaces fades out. */
  const [appliedKey, fading] = useFadeSwap(JSON.stringify([state, category]));
  const [shownState, shownCategory] = JSON.parse(appliedKey);

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
    const matched = rules.filter((rule) => {
      if (shownState !== 'all' && rule.state !== shownState) return false;
      if (shownCategory !== 'all' && rule.category !== shownCategory) return false;
      if (!needle) return true;
      return (
        (rule.title || '').toLowerCase().includes(needle) ||
        (rule.body || '').toLowerCase().includes(needle)
      );
    });

    // The API sorts by jurisdiction code, so the cards are re-ordered here:
    // first by the sequence the jurisdiction filter lists them in, then
    // alphabetically by category within each — CATEGORIES is held in
    // alphabetical order, so its index gives that for free — and finally by
    // title. Nothing is hand-ordered any more, so the list arranges itself.
    const rank = (list, value) => {
      const i = list.findIndex((item) => item.value === value);
      return i === -1 ? list.length : i;
    };
    return [...matched].sort(
      (a, b) =>
        rank(JURISDICTIONS, a.state) - rank(JURISDICTIONS, b.state) ||
        rank(CATEGORIES, a.category) - rank(CATEGORIES, b.category) ||
        (a.title || '').localeCompare(b.title || ''),
    );
  }, [rules, shownState, shownCategory, query]);

  const filtered = state !== 'all' || category !== 'all' || query.trim();

  const reset = () => {
    setState('all');
    setCategory('all');
    setQuery('');
  };

  return (
    <section
      ref={ref}
      className={`jl hm-band--light${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="jl__inner">
        {/* --- filters --- */}
        <div className="jl__filters">
          <div className="jl__row">
            <FilterSelect
              id="jl-jurisdiction"
              label="Filter by jurisdiction"
              value={state}
              options={[ALL_JURISDICTIONS, ...JURISDICTIONS]}
              onChange={setState}
              wide
            />

            <FilterSelect
              id="jl-category"
              label="Filter by category"
              value={category}
              options={[ALL_CATEGORIES, ...CATEGORIES]}
              onChange={setCategory}
            />

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

            {filtered && (
              <button type="button" className="jl__reset" onClick={reset}>
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* The results, and only the results — the filter row above stays live. */}
        <div className={`gp-swap${fading ? ' is-swapping' : ''}`}>
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
                    <span className="jl-card__state">
                      {JURISDICTION_BY_VALUE[rule.state]?.label || rule.state}
                    </span>
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
      </div>
    </section>
  );
}
