import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { tenderSitesApi } from '../../../api';
import './TenderPortals.css';

// Tender portals come from the CMS (Tenders). Each entry carries a name, a
// subtitle, a logo and up to three destinations — a button appears only for the
// links that have been filled in.
const DESTINATIONS = [
  { key: 'openTendersUrl', label: 'Open Tenders' },
  { key: 'upcomingTendersUrl', label: 'Upcoming Tenders' },
  { key: 'createAccountUrl', label: 'Create Free Account' },
];

// Keyed in the parent so it remounts and replays its reveal when the list loads.
function TenderList({ sites }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (sites.length === 0) {
    return (
      <ul className="tp__list">
        <li className="tp__empty-row">No tender websites have been added yet.</li>
      </ul>
    );
  }

  return (
    <ul className={`tp__list${shown ? ' is-in' : ''}`}>
      {sites.map((site) => (
        <li className="tp__row" key={site._id || site.id || site.name}>
          {/* The tile shows whether or not a logo has been uploaded, so the
              names line up across a row of cards. */}
          <span className="tp__logo">
            {site.logo?.url && <img src={site.logo.url} alt="" loading="lazy" />}
          </span>

          <span className="tp__name">
            {site.name}
            {site.subtitle && <span className="tp__desc">{site.subtitle}</span>}
          </span>

          <span className="tp__links">
            {DESTINATIONS.filter(({ key }) => site[key]).map(({ key, label }) => (
              <a
                key={key}
                className="tp__explore"
                href={site[key]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TenderPortals() {
  const { audience } = useAudience();

  const [sites, setSites] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await tenderSitesApi.list();
        if (!alive) return;
        setSites(list || []);
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

  return (
    <section className={`tp${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="tp__inner">
        <h1 className="tp__title">Explore Tenders</h1>
        <p className="tp__sub">
          Government tender opportunities, updated regularly across all sectors.
        </p>

        {status === 'loading' && <p className="tp__featured">Loading tender websites…</p>}
        {status === 'error' && (
          <p className="tp__featured">
            We couldn&apos;t load the tender websites right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && <TenderList sites={sites} />}
      </div>
    </section>
  );
}
