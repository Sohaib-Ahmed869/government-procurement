import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './TeamHero.css';

export default function TeamHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal();

  return (
    <section className={`team-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="team-hero__inner">
        <h1 className="team-hero__title">Our Team</h1>
      </div>
    </section>
  );
}
