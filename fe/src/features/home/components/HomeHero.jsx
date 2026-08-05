import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { homeHeroApi } from '../../../api';
import { AUDIENCE_EYEBROW } from '../../../constants/audiences.js';
import { useInView } from '../../../hooks/useInView.js';
import mainImage from '../../../assets/images/MainPictureHomepage.png';
import './HomeHero.css';

// Copy shipped with the page. The CMS (Content → Homepage hero) overrides any
// of these per segment; an empty field there falls back to the value here.
// The eyebrow follows the toggle — see AUDIENCE_EYEBROW.
const FALLBACK = {
  heading: 'Procure with Confidence',
  subheading:
    'Supporting government agencies and public sector organisations with end-to-end procurement advisory, ensuring that contracts are awarded fairly, efficiently, and in line with best practice.',
};

export default function HomeHero() {
  const { audience } = useAudience();

  // Both segments arrive in one call, so flipping the toggle doesn't refetch.
  const [copy, setCopy] = useState(null);
  useEffect(() => {
    let alive = true;
    homeHeroApi
      .get()
      .then((data) => {
        if (alive) setCopy(data || null);
      })
      .catch(() => {
        /* fall back to the built-in copy */
      });
    return () => {
      alive = false;
    };
  }, []);

  const forAudience = copy?.[audience] || {};
  const eyebrow = forAudience.eyebrow || AUDIENCE_EYEBROW[audience];
  const heading = forAudience.heading || FALLBACK.heading;
  const subheading = forAudience.subheading || FALLBACK.subheading;

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
        <p className="home-hero__eyebrow">{eyebrow}</p>
        <h1 className="home-hero__title">{heading}</h1>
        <p className="home-hero__lede">{subheading}</p>

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

          <a className="home-hero__btn home-hero__btn--trailing" href="/book-a-consultation">
            Request a Consultation
          </a>
        </div>

        <div className="home-hero__advisory-media">
          <img src={mainImage} alt="Advisory team meeting outdoors" />
        </div>
      </div>
    </section>
  );
}
