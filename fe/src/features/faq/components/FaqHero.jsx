import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import './FaqHero.css';

export default function FaqHero() {
  const { audience } = useAudience();

  // Mount animation: reveal after the first paint — matches the other page heroes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className={`faq-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="faq-hero__inner">
        <h1 className="faq-hero__title">Frequently asked questions</h1>
        <p className="faq-hero__sub">
          Everything you need to know about finding, preparing, and winning government
          procurement opportunities. Can&rsquo;t find an answer? Reach out, we&rsquo;re happy to help.
        </p>
      </div>
    </section>
  );
}
