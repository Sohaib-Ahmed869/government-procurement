import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './CoursesHero.css';

export default function CoursesHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  return (
    <section className={`courses-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>

      <div className="courses-hero__inner">
        <h1 className="courses-hero__title">Unlock your potential</h1>
        <p className="courses-hero__sub">
          From mastering the fundamentals to applying advanced strategies, our
          training empowers you to deliver stronger results and create lasting
          impact in your organisation.
        </p>
      </div>
    </section>
  );
}
