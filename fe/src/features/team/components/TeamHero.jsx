import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import './TeamHero.css';

export default function TeamHero() {
  const { audience } = useAudience();

  // Mount animation: reveal after the first paint, matching the other heroes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className={`team-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="team-hero__inner">
        <p className="team-hero__eyebrow">The people behind the work</p>
        <h1 className="team-hero__title">Our Team</h1>
        <p className="team-hero__sub">
          Advisers, trainers and contract specialists who have sat on both sides
          of the procurement table. Get to know the people you&rsquo;ll be
          working with.
        </p>
      </div>
    </section>
  );
}
