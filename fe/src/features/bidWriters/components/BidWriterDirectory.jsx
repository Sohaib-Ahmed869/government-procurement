import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bidWritersApi } from '../../../api';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import BackToTop from '../../../components/shared/BackToTop.jsx';
import { CATEGORIES, CATEGORY_BY_VALUE, STATES, STATE_BY_VALUE } from '../data.js';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import { readCache, writeCache, hasCache } from '../../../api/cache.js';
import './BidWriterDirectory.css';

// What this page's read is remembered under for the life of the tab.
const CACHE_KEY = 'bid-writers';

// B7.4 — the directory, on the shared browse shell (styles/browse.css) that the
// Prompt Library and the Templates library use.
//
// Two filters rather than three, and they combine: office location and
// category. Unlike the other two browse pages the results are NOT grouped —
// a directory of paid placements sorted into headed sections would be ranking
// advertisers against each other in public, and the only ordering anybody has
// bought is featured-above-standard.

const ALL = 'all';

function FilterGroup({ heading, name, options, value, onChange }) {
  return (
    <div className="browse-filter">
      <h3 className="browse-filter__heading">{heading}</h3>
      <div className="browse-filter__options">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`browse-radio${value === opt.value ? ' is-active' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span className="browse-radio__dot" aria-hidden="true" />
            <span className="browse-radio__label">{opt.label}</span>
            {opt.count !== undefined && <span className="browse-radio__count">{opt.count}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function BidWriterDirectory() {
  const { audience } = useAudience();
  const topRef = useRef(null);

  const [params, setParams] = useSearchParams();
  const state = params.get('state') || ALL;
  const category = params.get('category') || ALL;

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  /* Seeded from the tab's cache, so coming back to this page renders the
     listings on the first frame rather than showing an empty section for the
     length of a round trip — which is the gap that reads as a flash where the
     footer's contact band sits. The request below still goes out, so an edit
     made in the CMS lands on this view. See api/cache.js. */
  const [writers, setWriters] = useState(() => readCache(CACHE_KEY) ?? []);
  const [status, setStatus] = useState(() => (hasCache(CACHE_KEY) ? 'ready' : 'loading'));

  // The rail and the results are both built from the CMS list, so the reveal is
  // held until it lands — see the note on `ready` in useMountReveal. Played on
  // mount it runs over the "Loading…" line, and the cards that follow are
  // painted at their final opacity in the frame they mount.
  const inView = useMountReveal(undefined, { ready: status !== 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await bidWritersApi.list();
        if (!alive) return;
        writeCache(CACHE_KEY, list || []);
        setWriters(list || []);
        setStatus('ready');
      } catch {
        // A failed REFRESH must not blank a page that is already showing the
        // cached answer, so the error state is only for a page with nothing on
        // it yet.
        if (alive) setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const hasCategory = (w, value) => (w.categories || []).includes(value);

  // Counts measured against the other filter, so a number is what clicking it
  // actually yields.
  const stateOptions = useMemo(() => {
    const matches = (w) => category === ALL || hasCategory(w, category);
    return [
      { value: ALL, label: 'All locations', count: writers.filter(matches).length },
      ...STATES.map((s) => ({
        value: s.value,
        label: s.label,
        count: writers.filter((w) => w.officeState === s.value && matches(w)).length,
      })),
    ];
  }, [writers, category]);

  const categoryOptions = useMemo(() => {
    const matches = (w) => state === ALL || w.officeState === state;
    return [
      { value: ALL, label: 'All categories', count: writers.filter(matches).length },
      ...CATEGORIES.map((c) => ({
        value: c.value,
        label: c.label,
        count: writers.filter((w) => hasCategory(w, c.value) && matches(w)).length,
      })),
    ];
  }, [writers, state]);

  // B7.4 — the two filters combine.
  const visible = useMemo(
    () =>
      writers.filter(
        (w) =>
          (state === ALL || w.officeState === state) &&
          (category === ALL || hasCategory(w, category)),
      ),
    [writers, state, category],
  );

  const filtered = state !== ALL || category !== ALL;

  return (
    <section ref={topRef} className={`browse bw${inView ? ' is-in' : ''}`} data-audience={audience}>
      <BackToTop targetRef={topRef} label="Back to the filters" />

      <div className="browse__inner">
        <div id="browse-filter-panel" className={`browse-filters-wrap${filtersOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="browse-filters__close"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              strokeWidth="2" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          <aside className="browse-filters">
            <FilterGroup
              heading="Office location"
              name="state"
              options={stateOptions}
              value={state}
              onChange={(v) => setFilter('state', v)}
            />
            <FilterGroup
              heading="Category"
              name="category"
              options={categoryOptions}
              value={category}
              onChange={(v) => setFilter('category', v)}
            />

            {filtered && (
              <button
                type="button"
                className="browse-filters__reset"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Reset filters
              </button>
            )}
          </aside>
        </div>

        <div className="browse-main">
          <button
            type="button"
            className="browse-main__filter-button"
            aria-expanded={filtersOpen}
            aria-controls="browse-filter-panel"
            onClick={() => setFiltersOpen(true)}
          >
            Filter listings
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          <LoadingStatus loading={status === 'loading'} label="Loading listings" />
          {status === 'error' && (
            <p className="browse-main__note">
              We couldn&apos;t load the directory right now. Please try again shortly.
            </p>
          )}
          {status === 'ready' && writers.length === 0 && (
            <p className="browse-main__note">
              No companies are listed yet.
            </p>
          )}
          {status === 'ready' && writers.length > 0 && visible.length === 0 && (
            <p className="browse-main__note">No listings match those filters.</p>
          )}

          {/* No disclosure banner here: the hero already carries it, above the
              filters, where it is read before any listing rather than after. */}
          {visible.length > 0 && (
            <ul className="bw-list">
              {visible.map((writer) => (
                <BidWriterCard key={writer._id || writer.id} writer={writer} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// B7.5 — the listing and its contact path.
//
// No detail page. Everything a visitor needs to make contact is on the card,
// and a separate page per advertiser would be a thin page whose only content is
// somebody else's contact details.
/* Every way to reach an advertiser, as one row of buttons.

   They used to be a green "Visit website" followed by two bare links, which
   made the website look like the offer and the email and phone look like
   footnotes. A visitor choosing between five listings is choosing a CONTACT
   METHOD as much as a company, so each one is a target of the same weight.

   Built from a list rather than five hand-written blocks: an empty field must
   produce no button at all — a dead "LinkedIn" on every listing that hasn't
   given one is worse than an uneven row — and one `filter` is harder to get
   wrong five times than five conditionals are.

   `external` marks the ones leaving the site, which is what earns the
   target/rel pair. `mailto:` and `tel:` hand off to the device instead, and
   opening those in a new tab leaves an empty window behind.

   The labels are FIXED. They used to be written from the record — "Email Sarah
   Chen" on one listing and "Email" on the next, and the phone button captioned
   with the number itself — which meant the row of buttons was a different
   length and a different shape on every card, and a visitor comparing five
   listings had to read each row before they could find the one they wanted.
   Five constant words down the page are scanned once. */
function contactActions(writer) {
  const tel = writer.contactPhone ? writer.contactPhone.replace(/\s+/g, '') : '';
  return [
    { key: 'website', label: 'Visit Website', href: writer.website, external: true },
    {
      key: 'email',
      label: 'Email',
      href: writer.contactEmail ? `mailto:${writer.contactEmail}` : '',
    },
    { key: 'phone', label: 'Contact Number', href: tel ? `tel:${tel}` : '' },
    { key: 'linkedin', label: 'Linkedin', href: writer.linkedinUrl, external: true },
    { key: 'cases', label: 'Case Studies', href: writer.caseStudiesUrl, external: true },
  ].filter((a) => a.href);
}

function BidWriterCard({ writer }) {
  const state = STATE_BY_VALUE[writer.officeState];
  const location = [writer.officeCity, state?.label].filter(Boolean).join(', ');
  const actions = contactActions(writer);

  // `placementTier` no longer changes how a card looks. It decides where the
  // card sits and nothing else, which is the quietest a paid tier can be.
  return (
    <li className="bw-card">
      {/* Two columns: everything the advertiser says on the left, their image
          on the right. The small tile that used to sit to the LEFT of the
          company name is gone — at 56px it could only ever hold a logo, and it
          drew a box on every listing that had not supplied one. */}
      <div className="bw-card__grid">
        <div className="bw-card__main">
          <h2 className="bw-card__name">{writer.company}</h2>
          {location && <p className="bw-card__location">{location}</p>}

          {writer.blurb && <p className="bw-card__blurb">{writer.blurb}</p>}

          {(writer.categories || []).length > 0 && (
            <ul className="bw-card__tags">
              {writer.categories.map((c) => (
                <li className="bw-tag" key={c}>
                  {CATEGORY_BY_VALUE[c]?.label || c}
                </li>
              ))}
            </ul>
          )}

          {actions.length > 0 && (
            <div className="bw-card__contact">
              {actions.map((a) => (
                <a
                  key={a.key}
                  className="bw-card__btn"
                  href={a.href}
                  {...(a.external
                    ? { target: '_blank', rel: 'noopener noreferrer nofollow' }
                    : null)}
                >
                  {a.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Only drawn when there is something to draw. An empty frame here
            would be the same box on the right that was just removed from the
            left, and the copy simply takes the full width without it. */}
        {writer.logo?.url && (
          <div className="bw-card__media">
            <img src={writer.logo.url} alt="" loading="lazy" />
          </div>
        )}
      </div>
    </li>
  );
}
