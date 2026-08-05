import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { pageHeroApi } from '../../../api';
import './AdvisoryHero.css';

// Copy shipped with the page. The CMS (Content → Capabilities) overrides any of
// these per segment; an empty field there falls back to the value here.
const FALLBACK = {
  eyebrow: 'Award government contracts',
  heading: 'Our Capabilities',
  subheading:
    'Our advisory services create results that drive real impact. For buyers, we enable faster, smarter procurement that delivers value-for-money while building trust and reducing risk. For suppliers, we turn complexity into opportunity, helping you craft stronger proposals, win more contracts, and achieve sustainable growth.',
};

export default function AdvisoryHero() {
  const { audience } = useAudience();

  // Both segments arrive in one call, so flipping the toggle doesn't refetch.
  const [copy, setCopy] = useState(null);
  useEffect(() => {
    let alive = true;
    pageHeroApi
      .get('capabilities')
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
  const eyebrow = forAudience.eyebrow || FALLBACK.eyebrow;
  const heading = forAudience.heading || FALLBACK.heading;
  const subheading = forAudience.subheading || FALLBACK.subheading;

  // The sub-heading is one editable string, but small screens show only its
  // first sentence trailed by an ellipsis — so it is split for display here
  // rather than being stored as two fields the editor has to keep in step.
  const [lead, ...rest] = subheading.split(/(?<=\.)\s+/);
  const remainder = rest.join(' ');

  // Mount animation: reveal after the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      className={`adv-hero${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >

      <div className="adv-hero__inner">
        <p className="adv-hero__eyebrow">{eyebrow}</p>
        <h1 className="adv-hero__title">{heading}</h1>
        {/* Small screens show only the first sentence, trailed by an ellipsis. */}
        <p className="adv-hero__copy">
          <span className="adv-hero__copy-lead">{lead}</span>
          {remainder && <> <span className="adv-hero__copy-rest">{remainder}</span></>}
        </p>

        <div className="adv-hero__actions">
          <a className="adv-hero__btn" href="/book-a-consultation">
            Request a Consultation
          </a>
        </div>
      </div>
    </section>
  );
}
