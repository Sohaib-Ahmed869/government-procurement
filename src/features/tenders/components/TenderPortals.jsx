import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import wave from '../../../assets/images/WaveAdvisoryPage.png';
import phoneWave from '../../../assets/images/ForumPhoneWave.png';
import './TenderPortals.css';

// 'Countries' is the default (all/global).
const COUNTRY_OPTIONS = ['Countries', 'Australia', 'United States', 'Germany', 'Dubai', 'China'];

const GLOBAL_TENDERS = [
  { name: 'NSW eTendering', country: 'Australia' },
  { name: 'Acquisition.gov', country: 'United States' },
  { name: 'Deutsches Vergabeportal', country: 'Germany' },
  { name: 'UAE Digital Procurement Platform', country: 'Dubai' },
  { name: 'Central Government Procurement Network', country: 'China' },
];

const TENDERS_BY_COUNTRY = {
  Australia: [
    { name: 'NSW eTendering Portal (NSW Government)', country: 'Australia' },
    { name: 'Buying for Victoria Supplier Portal (Victoria Government)', country: 'Australia' },
    { name: 'QTenders Procurement Portal (Queensland Government)', country: 'Australia' },
    { name: 'Tenders WA (Western Australia Government)', country: 'Australia' },
    { name: 'SA Tenders and Contracts Portal (South Australia Government)', country: 'Australia' },
  ],
  'United States': [
    { name: 'SAM.gov (System for Award Management)', country: 'United States' },
    { name: 'Acquisition.gov (Federal Acquisition Portal)', country: 'United States' },
    { name: 'GSA eBuy (General Services Administration)', country: 'United States' },
    { name: 'Grants.gov (Federal Grants Portal)', country: 'United States' },
  ],
  Germany: [
    { name: 'Deutsches Vergabeportal (DTVP)', country: 'Germany' },
    { name: 'eVergabe (Federal Procurement Platform)', country: 'Germany' },
    { name: 'Vergabe24', country: 'Germany' },
    { name: 'Bund.de Ausschreibungen', country: 'Germany' },
  ],
  Dubai: [
    { name: 'UAE Digital Procurement Platform', country: 'Dubai' },
    { name: 'Dubai eSupply (Dubai Government)', country: 'Dubai' },
    { name: 'Dubai Municipality Tenders Portal', country: 'Dubai' },
  ],
  China: [
    { name: 'Central Government Procurement Network (CCGP)', country: 'China' },
    { name: 'China Tendering & Bidding Public Service Platform', country: 'China' },
    { name: 'China Government Procurement Network', country: 'China' },
  ],
};

// Keyed by country+sort in the parent, so it remounts and replays its reveal
// whenever the list changes (but not while typing in search).
function TenderList({ tenders }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ul className={`tp__list${shown ? ' is-in' : ''}`}>
      {tenders.map((t) => (
        <li className="tp__row" key={t.name}>
          <span className="tp__name">{t.name}</span>
          <span className="tp__country">
            <span className="tp__country-label">Country</span>
            <span className="tp__country-value">{t.country}</span>
          </span>
          <a className="tp__explore" href="#tenders">
            Explore Tenders
          </a>
        </li>
      ))}
      {tenders.length === 0 && (
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

// Small screens page the list four cards at a time, with dot navigation.
const PAGE_SIZE = 4;

export default function TenderPortals() {
  const { audience } = useAudience();
  const [country, setCountry] = useState('Countries');
  const [sort, setSort] = useState('asc');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  // Paging only applies on small screens; desktop shows the full list.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Mount animation: reveal after the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const tenders = useMemo(() => {
    const base = country === 'Countries' ? GLOBAL_TENDERS : TENDERS_BY_COUNTRY[country] ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q ? base.filter((t) => t.name.toLowerCase().includes(q)) : base;
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return sort === 'desc' ? sorted.reverse() : sorted;
  }, [country, sort, query]);

  const pageCount = isNarrow ? Math.ceil(tenders.length / PAGE_SIZE) : 1;

  // Filtering can shrink the list past the current page — clamp back.
  useEffect(() => {
    setPage(0);
  }, [country, sort, query]);

  const visibleTenders = isNarrow
    ? tenders.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    : tenders;

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
          {country === 'Countries' ? (
            <strong>Globally</strong>
          ) : (
            <>
              in <strong>{country}</strong>
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
            label="Country"
            value={country}
            onChange={setCountry}
            options={COUNTRY_OPTIONS.map((c) => ({ value: c, label: `Country: ${c}` }))}
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

        <p className="tp__featured">Featured Tenders</p>

        <TenderList key={`${country}-${sort}-${page}`} tenders={visibleTenders} />

        {pageCount > 1 && (
          <div className="tp__dots">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                className={`tp__dot${i === page ? ' is-active' : ''}`}
                aria-label={`Go to page ${i + 1}`}
                aria-current={i === page}
                onClick={() => setPage(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
