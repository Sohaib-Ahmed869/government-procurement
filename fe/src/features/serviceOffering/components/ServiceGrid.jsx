import { useEffect, useState } from 'react';
import { capabilitiesApi, capabilityCardsCache } from '../../../api';
import { CapabilityIcon } from '../serviceIcons.jsx';
import { resolveServices } from '../services.js';
import './ServiceGrid.css';

// A5 — all six services, easy to scan, under either side of the toggle.
//
// The six are fixed (see services.js); the copy on each is CMS-managed and
// arrives for both segments in one call, so flipping the toggle re-sorts and
// re-words what is already here rather than refetching.
//
// `variant` is the structural difference between the two segments rather than a
// skin: 'award' numbers the six as the stages of a procurement being run, and
// 'win' presents them as the points at which a bidder engages. Same services,
// two different readings of them.
export default function ServiceGrid({ audience, compact = false }) {
  const [saved, setSaved] = useState(capabilityCardsCache.get);

  useEffect(() => {
    let alive = true;
    capabilitiesApi
      .list()
      .then((list) => {
        if (!list) return;
        capabilityCardsCache.set(list);
        if (alive) setSaved(list);
      })
      .catch(() => {
        /* leave whatever is already on screen */
      });
    return () => {
      alive = false;
    };
  }, []);

  const services = resolveServices(saved, audience);

  return (
    <ol className={`sg${compact ? ' sg--compact' : ''}`} data-audience={audience}>
      {/* No `data-delay` on the items: the six arrive together. Staggering them
          read as the grid assembling itself one card at a time — fine on a
          first scroll, wrong on a segment switch, where the six are one set
          being re-lettered rather than six things appearing in turn. */}
      {services.map((service, i) => (
        <li className="sg__item hm-reveal" key={service.key}>
          <article className="sg__card">
            <header className="sg__head">
              <span className="sg__mark" aria-hidden="true">
                <CapabilityIcon name={service.icon} size={24} />
              </span>
              {/* The index is decoration on Award, where the six read as a
                  sequence, and is dropped on Win, where they don't. */}
              <span className="sg__no" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
            </header>

            <h3 className="sg__title">{service.title}</h3>
            {/* The stage is what tells a visitor where in their own process
                this service lands — the label differs by segment. */}
            <p className="sg__stage">{service.stage}</p>
            {service.body && <p className="sg__body">{service.body}</p>}
          </article>
        </li>
      ))}
    </ol>
  );
}
