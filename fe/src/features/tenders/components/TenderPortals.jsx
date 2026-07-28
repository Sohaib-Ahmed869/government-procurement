import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { linksApi } from '../../../api';
import './TenderPortals.css';

// Tender portal links come from the CMS API (group: 'tender'). Each link =
// { label, url, region ('featured'|'australia'), description }. The page shows
// one list at a time — Australian (default) or Featured — driven by the URL.
const REGION_LABEL = { featured: 'Featured', australia: 'Australian' };
// The two lists and their URLs. Australian is the default (shown on top).
const CATEGORY_PATH = { australia: '/aus-list', featured: '/featured-list' };

// Which list the current URL is showing (defaults to Australian).
function categoryFromPath(pathname) {
  return pathname === CATEGORY_PATH.featured ? 'featured' : 'australia';
}

function regionLabel(region) {
  return REGION_LABEL[region] || (region ? region.charAt(0).toUpperCase() + region.slice(1) : 'Other');
}

// Keyed by region in the parent, so it remounts and replays its reveal whenever
// the list changes.
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
            <span className="tp__country-label">List</span>
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
        <li className="tp__empty-row">No tenders in this list yet.</li>
      )}
    </ul>
  );
}

export default function TenderPortals() {
  const { audience } = useAudience();
  const { pathname } = useLocation();
  const category = categoryFromPath(pathname); // 'australia' | 'featured'

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

  // Links for the active list, sorted alphabetically — the order the sort
  // control used to default to.
  const filtered = useMemo(
    () =>
      links
        .filter((l) => (l.region || '') === category)
        .sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    [links, category],
  );

  return (
    <section
      className={`tp${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >

      <div className="tp__inner">
        <h1 className="tp__title">Explore {regionLabel(category)} Tenders</h1>
        <p className="tp__sub">
          Government tender opportunities, updated regularly across all sectors.
        </p>

        {status === 'loading' && <p className="tp__featured">Loading tender portals…</p>}
        {status === 'error' && (
          <p className="tp__featured">
            We couldn&apos;t load the tender portals right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && (
          <>
            <p className="tp__featured">{regionLabel(category)} Tenders</p>
            <TenderList key={category} links={filtered} />
          </>
        )}
      </div>
    </section>
  );
}
