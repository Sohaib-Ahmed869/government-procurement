import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './InsightsHero.css';

export default function InsightsHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  return (
    <section className={`insights-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="insights-hero__inner">
        <h1 className="insights-hero__title">Insights</h1>
      </div>
    </section>
  );
}
