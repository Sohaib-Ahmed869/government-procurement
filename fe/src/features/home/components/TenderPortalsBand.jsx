import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { tenderSitesApi } from '../../../api';
import './TenderPortalsBand.css';

// Three portals off the Tender Websites page, with the links that are actually
// useful — open tenders, upcoming, register — rather than the homepage of each
// site. Renders nothing until the CMS has at least one entry, so an empty
// install leaves no gap on the homepage.
export default function TenderPortalsBand() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();
  const [sites, setSites] = useState([]);

  useEffect(() => {
    let alive = true;
    tenderSitesApi
      .list({ group: 'australian' })
      .then((list) => {
        if (alive) setSites((list || []).slice(0, 3));
      })
      .catch(() => {
        /* the band simply doesn't render */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (sites.length === 0) return null;

  return (
    <section
      ref={ref}
      id="tender-websites"
      className={`hm-band hm-band--dark-3${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="tender-portals-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="tender-portals-title">
          Every portal, in one place
        </h2>
        <p className="hm-band__lede">
          Federal, state and territory tender sites, with the registration and open-tender
          links you actually need, not the homepage you have to dig through.
        </p>
      </div>

      <div className="hm-shell">
        <ul className="tpb__grid">
          {sites.map((site, i) => (
            <li
              className="tpb__item hm-reveal"
              data-delay={String(Math.min(3, i))}
              key={site._id || site.name}
            >
              <article className="tpb__card">
                {site.subtitle && <p className="tpb__sub">{site.subtitle}</p>}
                <h3 className="tpb__name">{site.name}</h3>

                <div className="tpb__links">
                  <PortalChip href={site.openTendersUrl} label="Open tenders" />
                  <PortalChip href={site.upcomingTendersUrl} label="Upcoming" />
                  <PortalChip href={site.createAccountUrl} label="Create an account" />
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="hm-reveal" data-delay="4">
          <Link className="hm-arrow" to="/aus-list">
            See the full list of tender websites <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// A portal that doesn't publish one of the three destinations simply doesn't
// show that chip — an empty one would be a dead link dressed as a button.
function PortalChip({ href, label }) {
  if (!href) return null;
  return (
    <a className="tpb__chip" href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}
