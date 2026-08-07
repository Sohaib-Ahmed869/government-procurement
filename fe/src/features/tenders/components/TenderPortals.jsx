import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { tenderSitesApi } from '../../../api';
import './TenderPortals.css';

// Tender portals come from the CMS (Tenders). Each entry carries a name, a
// subtitle, a logo and its destinations — a button appears only for the links
// that have been filled in.
//
// The two sections offer different destinations: the Australian portals are
// free to search once you have an account, while the others are paywalled and
// carry a single sign-in link plus the note printed under it.
// `gated` marks the labels that pick up "(Login Required)" — only on the
// portals whose listings actually sit behind a sign-in, which is a per-entry
// tick in the CMS rather than something true of every portal.
const DESTINATIONS = {
  australian: [
    { key: 'openTendersUrl', label: 'Open Tenders', gated: true },
    { key: 'upcomingTendersUrl', label: 'Upcoming Tenders', gated: true },
    { key: 'createAccountUrl', label: 'Create Free Account' },
  ],
  other: [{ key: 'loginUrl', label: 'Login (Paid wall)' }],
};

// Keyed in the parent so it remounts and replays its reveal when the list loads.
function TenderList({ sites, group = 'australian' }) {
  const destinations = DESTINATIONS[group] || DESTINATIONS.australian;

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
            {destinations
              .filter(({ key }) => site[key])
              .map(({ key, label, gated }) => (
                <a
                  key={key}
                  className="tp__explore"
                  href={site[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {gated && site.loginRequired ? `${label} (Login Required)` : label}
                </a>
              ))}

            {/* Sits under the buttons: the fee disclaimer for paywalled sites. */}
            {site.note && <span className="tp__note">{site.note}</span>}
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

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  // The CMS marks each entry as 'australian' or 'other'; entries saved before
  // that field existed carry no group and belong to the Australian list.
  const australian = sites.filter((s) => (s.group || 'australian') === 'australian');
  const other = sites.filter((s) => s.group === 'other');

  return (
    <section className={`tp${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="tp__inner">
        <h1 className="tp__title">
          Explore Federal, State and Territory Tender Websites
        </h1>

        {status === 'loading' && <p className="tp__featured">Loading tender websites…</p>}
        {status === 'error' && (
          <p className="tp__featured">
            We couldn&apos;t load the tender websites right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && (
          <>
            <TenderList sites={australian} />

            {/* Only drawn once something has been filed under it, so the page
                doesn't carry an empty heading. */}
            {other.length > 0 && (
              <>
                <h2 className="tp__group-title">Other Tender Websites</h2>
                <TenderList sites={other} group="other" />
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
