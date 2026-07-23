import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import './InsightsHero.css';

export default function InsightsHero() {
  const { audience } = useAudience();

  // Mount animation: reveal after the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className={`insights-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="insights-hero__inner">
        <h1 className="insights-hero__title">Insights</h1>
        <p className="insights-hero__sub">
          From mastering the fundamentals to applying advanced strategies, our
          training empowers you to deliver stronger results and create lasting
          impact in your organisation.
        </p>
      </div>
    </section>
  );
}
