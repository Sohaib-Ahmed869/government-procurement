import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './JurisdictionsHero.css';

export default function JurisdictionsHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  return (
    <section className={`jl-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="jl-hero__inner">
        <h1 className="jl-hero__title">Procurement Resources by Jurisdiction</h1>
      </div>
    </section>
  );
}
