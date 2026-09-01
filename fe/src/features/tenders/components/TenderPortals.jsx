import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { useInView } from '../../../hooks/useInView.js';
import { tenderSitesApi } from '../../../api';
import LoadingStatus from '../../../components/shared/LoadingStatus.jsx';
import { readCache, writeCache, hasCache } from '../../../api/cache.js';
import './TenderPortals.css';

// What this page's read is remembered under for the life of the tab.
const CACHE_KEY = 'tender-sites';

// Tender portals come from the CMS (Tenders). Each entry carries a name, a
// subtitle, a logo and its destinations — a button appears only for the links
// that have been filled in.
//
// The three sections offer different destinations.
//
// The federal/state portals carry three: the open tender search, the
// upcoming/forecast notices, and where to register. `gated` marks the labels
// that pick up "(Login Required)" — the two that lead into listings. Creating
// an account is the thing you do *because* of the wall, so it never carries the
// suffix. Whether it shows at all is the per-entry tick in the CMS, not
// something assumed of a whole section: today that is South Australia and
// nothing else.
//
// Local government carries ONE: the council's own site. A council does not
// publish a forecast pipeline or run a supplier registration the way a state
// portal does, so two of the three buttons were always going to be empty on
// these cards. The single link reuses `openTendersUrl` — the field the entries
// already store their address in — under the label that describes what it
// actually is.
//
// The 'other' sites are paywalled and carry a single sign-in link plus the note
// printed under it.
const DESTINATIONS = {
  australian: [
    { key: 'openTendersUrl', label: 'Open Tenders', gated: true },
    { key: 'upcomingTendersUrl', label: 'Upcoming Tenders', gated: true },
    { key: 'createAccountUrl', label: 'Create Free Account' },
  ],
  local: [{ key: 'openTendersUrl', label: 'Website Link' }],
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
    <ul ref={ref} className={`tp__list tp__list--${group}${inView ? ' is-in' : ''}`}>
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
          </span>

          {/* The fee disclaimer for paywalled sites, a sibling of the buttons
              rather than a child of them. It has to be its own row of the card's
              subgrid (TenderPortals.css) for the buttons above it to line up
              across the cards in a row — inside .tp__links, a two-line subtitle
              in one card pushed that whole block down and took the button with
              it. */}
          {site.note && <span className="tp__note">{site.note}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function TenderPortals() {
  const { audience } = useAudience();

  /* Seeded from the tab's cache, so coming back to this page renders the
     sites on the first frame rather than showing an empty section for the
     length of a round trip — which is the gap that reads as a flash where the
     footer's contact band sits. The request below still goes out, so an edit
     made in the CMS lands on this view. See api/cache.js. */
  const [sites, setSites] = useState(() => readCache(CACHE_KEY) ?? []);
  const [status, setStatus] = useState(() => (hasCache(CACHE_KEY) ? 'ready' : 'loading'));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await tenderSitesApi.list();
        if (!alive) return;
        writeCache(CACHE_KEY, list || []);
        setSites(list || []);
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
          <h1 className="tp__title">Explore Australian Tender Websites</h1>
        </div>
      </section>

      <LoadingStatus loading={status === 'loading'} label="Loading tender websites" />

      {/* The failure message, below the band rather than inside it. In the band
          it was part of what it had to hold, so the heading strip was 132px
          tall while the list was still coming and 90px once it arrived — the
          title jumping up by the height of a line on every visit, and staying
          down on a page that had failed to load.

          Only the failure now. The loading line that used to sit here has gone:
          the lists fade in as they arrive, so the wait needs nothing on screen
          and the band no longer changes height between one state and the next.
          A page that cannot load still has to say so. */}
      {status === 'error' && (
        <section className="tp__band tp__band--status hm-band--light">
          <div className="tp__inner">
            <p className="tp__featured">
              We couldn&apos;t load the tender websites right now. Please try again shortly.
            </p>
          </div>
        </section>
      )}

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
                <h2 className="tp__group-title">Local Government (Council)</h2>
                <TenderList sites={local} group="local" audience={audience} />
              </div>
            </section>
          )}

          {other.length > 0 && (
            <section className="tp__band tp__band--other hm-band--light-2">
              <div className="tp__inner">
                <h2 className="tp__group-title">Other Useful Websites</h2>
                <TenderList sites={other} group="other" audience={audience} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
