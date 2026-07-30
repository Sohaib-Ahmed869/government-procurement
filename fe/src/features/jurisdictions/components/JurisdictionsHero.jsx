import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import './JurisdictionsHero.css';

export default function JurisdictionsHero() {
  const { audience } = useAudience();

  // Mount animation: reveal after the first paint, matching the other heroes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className={`jl-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="jl-hero__inner">
        <h1 className="jl-hero__title">Procurement rules by state</h1>
        <p className="jl-hero__sub">
          Explore the procurement rules and thresholds that apply in each
          Australian state and territory, filter by jurisdiction or rule type.
        </p>
      </div>
    </section>
  );
}
