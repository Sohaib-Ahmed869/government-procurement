import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import './AdvisoryHero.css';

export default function AdvisoryHero() {
  const { audience } = useAudience();

  // Mount animation: reveal after the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      className={`adv-hero${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >

      <div className="adv-hero__inner">
        <p className="adv-hero__eyebrow">Award government contracts</p>
        <h1 className="adv-hero__title">Our Capabilities</h1>
        {/* Small screens show only the first sentence, trailed by an ellipsis. */}
        <p className="adv-hero__copy">
          <span className="adv-hero__copy-lead">
            Our advisory services create results that drive real impact. For buyers, we enable
            faster, smarter procurement that delivers value-for-money while building trust and
            reducing risk.
          </span>{' '}
          <span className="adv-hero__copy-rest">
            For suppliers, we turn complexity into opportunity, helping you craft stronger
            proposals, win more contracts, and achieve sustainable growth.
          </span>
        </p>

        <div className="adv-hero__actions">
          <a className="adv-hero__btn" href="/book-a-consultation">
            Book a Consultation
          </a>
          <a
            className="adv-hero__btn"
            href="https://wa.me/61478669922"
            target="_blank"
            rel="noopener noreferrer"
          >
            Whatsapp +61 478 669 922
          </a>
        </div>
      </div>
    </section>
  );
}
