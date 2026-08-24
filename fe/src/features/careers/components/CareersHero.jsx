import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './CareersHero.css';

export default function CareersHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal();

  return (
    <section className={`careers-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="careers-hero__inner">
        <h1 className="careers-hero__title">Join Our Growing Team</h1>
      </div>
    </section>
  );
}
