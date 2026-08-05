import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { AUDIENCE_EYEBROW } from '../../../constants/audiences.js';
import './AdvisoryHero.css';

export default function AdvisoryHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  return (
    <section
      className={`adv-hero${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="adv-hero__inner">
        <p className="adv-hero__eyebrow">{AUDIENCE_EYEBROW[audience]}</p>
        <h1 className="adv-hero__title">Our Capabilities</h1>
      </div>
    </section>
  );
}
