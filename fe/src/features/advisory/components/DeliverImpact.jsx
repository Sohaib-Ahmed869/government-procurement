import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { capabilitiesApi, capabilityCardsCache } from '../../../api';
import { CAPABILITY_ICON_BY_KEY } from '../capabilityIcons.js';
import './DeliverImpact.css';

// The cards carry no built-in copy — they all come from the CMS (Capabilities),
// seeded by `npm run seed:capabilities`. The set that used to ship with the page
// painted on every mount while the request was still out, so an edited card
// flashed the shipped wording before the saved one arrived.
export default function DeliverImpact() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  // Cards come from the CMS (Capabilities). Both segments arrive in one call,
  // so flipping the toggle filters what's already here rather than refetching.
  // Seeded from the module-level cache, so a second visit renders the cards on
  // the first paint instead of waiting on the network again.
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

  // A card is written for one side of the toggle or for both. Until the CMS has
  // one for this segment the row is simply empty — there is no built-in set to
  // stand in for it.
  const cards = (saved || []).filter(
    (c) => !c.audience || c.audience === 'both' || c.audience === audience,
  );

  return (
    <section
      ref={ref}
      className={`di${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="di__inner">
        <div className="di__grid">
          {cards.map((c) => {
            const icon = CAPABILITY_ICON_BY_KEY[c.icon];
            return (
              <article className="di__card" key={c._id || c.title}>
                {icon && (
                  <span className="di__icon">
                    <img src={icon.src} alt="" />
                  </span>
                )}
                <h3 className="di__card-title">{c.title}</h3>
                <p className="di__card-body">{c.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
