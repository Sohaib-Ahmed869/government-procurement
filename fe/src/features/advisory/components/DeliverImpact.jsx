import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { capabilitiesApi } from '../../../api';
import {
  CAPABILITY_ICON_BY_KEY,
  FALLBACK_CAPABILITIES,
} from '../capabilityIcons.js';
import './DeliverImpact.css';

export default function DeliverImpact() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  // Cards come from the CMS (Capabilities). Until any are saved — or if the
  // fetch fails — the page falls back to the set built into it, so the section
  // is never empty.
  const [cards, setCards] = useState(FALLBACK_CAPABILITIES);
  useEffect(() => {
    let alive = true;
    capabilitiesApi
      .list()
      .then((list) => {
        if (alive && list?.length) setCards(list);
      })
      .catch(() => {
        /* keep the built-in cards */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section
      ref={ref}
      className={`di${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="di__inner">
        <h2 className="di__heading">Deliver with Impact</h2>

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
