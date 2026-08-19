import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { useInView } from '../../../hooks/useInView.js';
import { tenderSitesApi } from '../../../api';
import './TenderPortals.css';

// Tender portals come from the CMS (Tenders). Each entry carries a name, a
// subtitle, a logo and its destinations — a button appears only for the links
// that have been filled in.
//
// The three sections offer different destinations. The government portals —
// federal, state and local alike — carry the same three buttons. The 'other'
// sites are paywalled and carry a single sign-in link plus the note printed
// under it.
//
// `gated` marks the labels that pick up "(Login Required)" — the two that lead
// into listings. Creating an account is the thing you do *because* of the wall,
// so it never carries the suffix. Whether it shows at all is the per-entry tick
// in the CMS, not something assumed of a whole section: today that is South
// Australia and nothing else.
const GOVERNMENT_DESTINATIONS = [
  { key: 'openTendersUrl', label: 'Open Tenders', gated: true },
  { key: 'upcomingTendersUrl', label: 'Upcoming Tenders', gated: true },
  { key: 'createAccountUrl', label: 'Create Free Account' },
];

const DESTINATIONS = {
  australian: GOVERNMENT_DESTINATIONS,
  local: GOVERNMENT_DESTINATIONS,
  other: [{ key: 'loginUrl', label: 'Login (Paid wall)' }],
};

// A band of cards, revealed as it is scrolled to rather than on mount.
//
// It used to fade in the moment the page loaded, which meant the two lists
// below the fold had already played by the time anybody reached them — the
// animation happened, but to nobody. `useInView` is what the homepage bands use
// and is the site's convention for anything below the hero.
//
// threshold 0: a band of cards is taller than a phone viewport, so waiting for
// 15% of it to be on screen can never fire. Same trap the article body hit.
function TenderList({ sites, group = 'australian', audience }) {
  const destinations = DESTINATIONS[group] || DESTINATIONS.australian;
  const { ref, inView } = useInView({ threshold: 0 });

  if (sites.length === 0) {
    return (
      <ul className="tp__list" ref={ref}>
        <li className="tp__empty-row">No tender websites have been added yet.</li>
      </ul>
    );
  }

  return (
    <ul ref={ref} className={`tp__list${inView ? ' is-in' : ''}`}>
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
  const mounted = useMountReveal();

  // The CMS marks each entry as 'australian' or 'other'; entries saved before
  // that field existed carry no group and belong to the Australian list.
  const australian = sites.filter((s) => (s.group || 'australian') === 'australian');
  // B3 — councils and local-government buying groups, between the government
  // list above and the paywalled sites below.
  const local = sites.filter((s) => s.group === 'local');
  const other = sites.filter((s) => s.group === 'other');

  return (
    <div className={`tp${mounted ? ' is-in' : ''}`} data-audience={audience}>
      {/* Each section is a full-bleed band, alternating dark and light the way
          the homepage and Service Offering pages do — the shades come from the
          shared .hm-band--* set in styles/bands.css, so this page is built from
          the same grounds rather than its own private ramp.

          The h1 no longer names one of the lists. It used to read "Explore
          Federal, State and Territory Tender Websites", which was the page
          title and the first section's heading at once — so once Local
          Government and Other were added below it, the page's own title
          described a third of its contents. The title is now the page, and each
          list carries its own h2. */}
      <section className="tp__band tp__band--head hm-band--dark">
        <div className="tp__inner">
          <h1 className="tp__title">Explore Tender Websites</h1>

          {status === 'loading' && <p className="tp__featured">Loading tender websites…</p>}
          {status === 'error' && (
            <p className="tp__featured">
              We couldn&apos;t load the tender websites right now. Please try again shortly.
            </p>
          )}
        </div>
      </section>

      {status === 'ready' && (
        <>
          <section className="tp__band tp__band--gov hm-band--light">
            <div className="tp__inner">
              <h2 className="tp__group-title">Federal, State and Territory Government</h2>
              <TenderList sites={australian} audience={audience} />
            </div>
          </section>

          {/* B3.3 — Local Government sits between the federal/state list and
              the paywalled sites. Each band is only drawn once something has
              been filed under it, so the page never carries an empty heading —
              and never an empty stripe of colour either. */}
          {local.length > 0 && (
            <section className="tp__band tp__band--local hm-band--dark">
              <div className="tp__inner">
                <h2 className="tp__group-title">Local Government</h2>
                <TenderList sites={local} group="local" audience={audience} />
              </div>
            </section>
          )}

          {other.length > 0 && (
            <section className="tp__band tp__band--other hm-band--light-2">
              <div className="tp__inner">
                <h2 className="tp__group-title">Other Tender Websites</h2>
                <TenderList sites={other} group="other" audience={audience} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
