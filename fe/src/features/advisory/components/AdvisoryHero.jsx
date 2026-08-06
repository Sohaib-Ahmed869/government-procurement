import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { capabilitiesHeroApi, capabilitiesHeroCopyCache } from '../../../api';
import './AdvisoryHero.css';

// The hero carries no copy of its own — every line comes from the API, which
// serves whatever the CMS holds (Pages → Capabilities) and falls back to the
// page's original wording for any field nobody has written. See DEFAULT_COPY in
// capabilitiesHero.controller.js.
//
// It used to hold the eyebrow as a constant and "Our Capabilities" straight in
// the markup, neither of which could be changed without a deploy.
export default function AdvisoryHero() {
  const { audience } = useAudience();

  // Both segments arrive in one call, so flipping the toggle doesn't refetch.
  // Seeded from the module-level cache, so a second visit renders the copy on
  // the first paint instead of waiting on the network again.
  const [copy, setCopy] = useState(capabilitiesHeroCopyCache.get);
  useEffect(() => {
    let alive = true;
    capabilitiesHeroApi
      .get()
      .then((data) => {
        if (!data) return;
        capabilitiesHeroCopyCache.set(data);
        if (alive) setCopy(data);
      })
      .catch(() => {
        /* leave whatever is already on screen */
      });
    return () => {
      alive = false;
    };
  }, []);

  const { eyebrow, heading, subheading } = copy?.[audience] || {};

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  return (
    <section
      className={`adv-hero${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="adv-hero__inner">
        {/* Each line renders only once the CMS has one for it, so the first
            paint of a cold load is blank rather than wrong. */}
        {eyebrow && <p className="adv-hero__eyebrow">{eyebrow}</p>}
        {heading && <h1 className="adv-hero__title">{heading}</h1>}
        {subheading && <p className="adv-hero__lede">{subheading}</p>}
      </div>
    </section>
  );
}
