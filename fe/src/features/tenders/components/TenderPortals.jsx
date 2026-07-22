import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { linksApi } from '../../../api';
import wave from '../../../assets/images/WaveAdvisoryPage.png';
import phoneWave from '../../../assets/images/ForumPhoneWave.png';
import './TenderPortals.css';

// Tender portal links come from the CMS API (group: 'tender'). Each link =
// { label, url, region ('global'|'australia'), description }. We group by region
// with a heading per group.
const REGION_LABEL = { global: 'Global', australia: 'Australia' };
// Preferred display order for region groups; anything else follows.
const REGION_ORDER = ['global', 'australia'];

function regionLabel(region) {
  return REGION_LABEL[region] || (region ? region.charAt(0).toUpperCase() + region.slice(1) : 'Other');
}

// Keyed by region+sort in the parent, so it remounts and replays its reveal
// whenever the list changes (but not while typing in search).
function TenderList({ links }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ul className={`tp__list${shown ? ' is-in' : ''}`}>
      {links.map((t) => (
        <li className="tp__row" key={t._id || t.id || t.url}>
          <span className="tp__name">
            {t.label}
            {t.description && <span className="tp__desc">{t.description}</span>}
          </span>
          <span className="tp__country">
            <span className="tp__country-label">Region</span>
            <span className="tp__country-value">{regionLabel(t.region)}</span>
          </span>
          <a
            className="tp__explore"
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore Tenders
          </a>
        </li>
      ))}
      {links.length === 0 && (
        <li className="tp__empty-row">No tenders match your search.</li>
      )}
    </ul>
  );
}

// Custom listbox rather than a native <select>: the OS-drawn popup can't be
// rounded or themed. Used for both the country and sort pickers.
function ChevronSelect({ value, onChange, options, variant, label }) {
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
    <div className={`tp__select${variant ? ` tp__select--${variant}` : ''}`} ref={ref}>
      <button
        type="button"
        className="tp__select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {current.label}
      </button>

      <svg className={`tp__chevron${open ? ' is-open' : ''}`} viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* Small screens collapse the country picker to this globe circle. */}
      {variant === 'country' && (
        <svg className="tp__globe" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      )}

      {open && (
        <ul className="tp__menu" role="listbox">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`tp__option${o.value === value ? ' is-active' : ''}`}
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

export default function TenderPortals() {
  const { audience } = useAudience();
  const [region, setRegion] = useState('all');
  const [sort, setSort] = useState('asc');
  const [query, setQuery] = useState('');

  const [links, setLinks] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await linksApi.list({ group: 'tender' });
        if (!alive) return;
        setLinks(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Mount animation: reveal after the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Distinct regions present in the data, in preferred order.
  const regionsInData = useMemo(() => {
    const seen = new Set(links.map((l) => l.region || 'other'));
    const ordered = REGION_ORDER.filter((r) => seen.has(r));
    const rest = [...seen].filter((r) => !REGION_ORDER.includes(r));
    return [...ordered, ...rest];
  }, [links]);

  const regionOptions = useMemo(
    () => [
      { value: 'all', label: 'Region: All' },
      ...regionsInData.map((r) => ({ value: r, label: `Region: ${regionLabel(r)}` })),
    ],
    [regionsInData],
  );

  // Search + sort applied across the whole set before grouping.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? links.filter(
          (l) =>
            (l.label || '').toLowerCase().includes(q) ||
            (l.description || '').toLowerCase().includes(q),
        )
      : links;
    const sorted = [...base].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    return sort === 'desc' ? sorted.reverse() : sorted;
  }, [links, query, sort]);

  // Group into ordered { region, links } buckets, honouring the region filter.
  const groups = useMemo(() => {
    const activeRegions = region === 'all' ? regionsInData : [region];
    return activeRegions
      .map((r) => ({
        region: r,
        links: filtered.filter((l) => (l.region || 'other') === r),
      }))
      .filter((g) => g.links.length > 0);
  }, [filtered, region, regionsInData]);

  // Award contract is intentionally empty for now.
  if (audience !== 'win') {
    return <section className="tp tp--empty" data-audience={audience} />;
  }

  return (
    <section
      className={`tp${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >
      {/* Phones get the wave drawn for narrow screens; CSS swaps which shows. */}
      <img className="tp__wave" src={wave} alt="" aria-hidden="true" />
      <img className="tp__wave tp__wave--phone" src={phoneWave} alt="" aria-hidden="true" />

      <div className="tp__inner">
        <h1 className="tp__title">
          Explore Tender Websites{' '}
          {region === 'all' ? (
            <strong>Globally</strong>
          ) : (
            <>
              in <strong>{regionLabel(region)}</strong>
            </>
          )}
        </h1>
        <p className="tp__sub">
          Government tender opportunities from every country, updated across all sectors
          worldwide.
        </p>

        <form className="tp__controls" onSubmit={(e) => e.preventDefault()}>
          <div className="tp__search-wrap">
            <svg className="tp__search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            <input
              className="tp__search"
              type="search"
              placeholder="Search tenders"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search tenders"
            />
          </div>

          <ChevronSelect
            variant="country"
            label="Region"
            value={region}
            onChange={setRegion}
            options={regionOptions}
          />

          <ChevronSelect
            variant="sort"
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'asc', label: 'Sort by: Alphabetical (Ascending)' },
              { value: 'desc', label: 'Sort by: Alphabetical (Descending)' },
            ]}
          />

          <button type="submit" className="tp__search-btn">
            Search
          </button>
        </form>

        {status === 'loading' && <p className="tp__featured">Loading tender portals…</p>}
        {status === 'error' && (
          <p className="tp__featured">
            We couldn&apos;t load the tender portals right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && groups.length === 0 && (
          <p className="tp__featured">No tender portals match your search.</p>
        )}

        {status === 'ready' &&
          groups.map((g) => (
            <div key={g.region}>
              <p className="tp__featured">{regionLabel(g.region)} Tenders</p>
              <TenderList key={`${g.region}-${sort}`} links={g.links} />
            </div>
          ))}
      </div>
    </section>
  );
}
