import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { homeHeroApi, heroCopyCache } from '../../../api';
import { useInView } from '../../../hooks/useInView.js';
import mainImage from '../../../assets/images/MainPictureHomepage.png';
import './HomeHero.css';

// The hero carries no copy of its own — every line comes from the API, which
// serves whatever the CMS holds (Pages → Homepage) and falls back to the
// page's original wording for any field nobody has written. See DEFAULT_COPY in
// homeHero.controller.js.
//
// It used to ship with a FALLBACK block and AUDIENCE_EYEBROW as defaults, which
// React painted on every mount while the request was still out. An edited
// heading therefore flashed the shipped wording for a beat before the saved one
// arrived — most visibly on returning to the homepage, since remounting reset
// the fetched copy. Resolving the fallback on the server means the browser only
// ever sees one version, so there is nothing to flash.
export default function HomeHero() {
  const { audience } = useAudience();

  // Both segments arrive in one call, so flipping the toggle doesn't refetch.
  // Seeded from the module-level cache, so a second visit renders the copy on
  // the first paint instead of waiting on the network again.
  const [copy, setCopy] = useState(heroCopyCache.get);
  useEffect(() => {
    let alive = true;
    homeHeroApi
      .get()
      .then((data) => {
        if (!data) return;
        heroCopyCache.set(data);
        if (alive) setCopy(data);
      })
      .catch(() => {
        /* leave whatever is already on screen */
      });
    return () => {
      alive = false;
    };
  }, []);

  const forAudience = copy?.[audience] || {};
  const { eyebrow, heading, subheading } = forAudience;

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  // The advisory block sits lower down, so reveal it on scroll-in instead.
  // Passing the audience replays the reveal when the toggle changes.
  const advisory = useInView({ resetKey: audience });

  return (
    <section
      className={`home-hero${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >

      <div className="home-hero__intro">
        {/* Each line renders only once the CMS has one for it, so the first
            paint of a cold load is blank rather than wrong. */}
        {eyebrow && <p className="home-hero__eyebrow">{eyebrow}</p>}
        {heading && <h1 className="home-hero__title">{heading}</h1>}
        {subheading && <p className="home-hero__lede">{subheading}</p>}

        <div className="home-hero__actions">
          <a className="home-hero__btn" href="/book-a-consultation">
            Request a Consultation
          </a>
        </div>
      </div>

      <div
        ref={advisory.ref}
        className={`home-hero__advisory${advisory.inView ? ' is-in' : ''}`}
      >
        <div className="home-hero__advisory-text">
          <p className="home-hero__eyebrow">Advisory Services</p>
          <h2 className="home-hero__subtitle">Your Trusted Partner</h2>
          <p className="home-hero__advisory-copy">
            We help private sector organisations and suppliers strengthen their bids and win
            more contracts. Our end-to-end advisory services ensure your proposals are
            competitive, compliant, and compelling, giving you the edge in a highly contested
            marketplace.
          </p>
        </div>

        <div className="home-hero__advisory-media">
          <img src={mainImage} alt="Advisory team meeting outdoors" />
        </div>
      </div>
    </section>
  );
}
