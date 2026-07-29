import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import './CareersHero.css';

export default function CareersHero() {
  const { audience } = useAudience();

  // Mount animation: reveal after the first paint, matching the other heroes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className={`careers-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="careers-hero__inner">
        <p className="careers-hero__eyebrow">Work with us</p>
        <h1 className="careers-hero__title">Careers</h1>
        <p className="careers-hero__sub">
          Culture is our most valued asset. We are professionals who embrace
          collaboration, seek better ways of working, and help our clients get
          procurement right.
        </p>
      </div>
    </section>
  );
}
