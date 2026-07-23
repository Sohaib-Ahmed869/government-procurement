import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import callIcon from '../../../assets/icons/Call.png';
import wave from '../../../assets/images/WaveAdvisoryPage.png';
import './AdvisoryHero.css';

function CircleIcon({ src, size = 30 }) {
  return (
    <span className="adv-hero__circle" aria-hidden="true">
      <img src={src} alt="" style={{ width: `${size}px`, height: `${size}px` }} />
    </span>
  );
}

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
      <img className="adv-hero__wave" src={wave} alt="" aria-hidden="true" />

      <div className="adv-hero__inner">
        <p className="adv-hero__eyebrow">Award Government Contracts</p>
        <h1 className="adv-hero__title">Advisory Services</h1>
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
            <CircleIcon src={arrowIcon} />
            Book a Consultation
          </a>
          <a className="adv-hero__btn" href="tel:+61478669922">
            <CircleIcon src={callIcon} />
            Whatsapp +61 478 669 922
          </a>
        </div>
      </div>
    </section>
  );
}
