import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import callIcon from '../../../assets/icons/Call.png';
import mainImage from '../../../assets/images/MainPictureHomepage.png';
import wavesImage from '../../../assets/images/waves.png';
import './HomeHero.css';

// The dark glyph sits on transparent padding inside a white circle. Scaling the
// image up and clipping to the circle crops that padding so the glyph fills it
// (arrow ink ~24% of its canvas, call ~38% — hence the different sizes).
function CircleIcon({ src, size }) {
  return (
    <span className="home-hero__circle" aria-hidden="true">
      <img src={src} alt="" style={{ width: `${size}px`, height: `${size}px` }} />
    </span>
  );
}

export default function HomeHero() {
  const { audience } = useAudience();

  // Mount animation: reset to hidden then flip the flag after a paint so the
  // reveal transitions play on load and again whenever the audience toggles.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    let inner;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMounted(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [audience]);

  // The advisory block sits lower down, so reveal it on scroll-in instead.
  // Passing the audience replays the reveal when the toggle changes.
  const advisory = useInView({ resetKey: audience });

  return (
    <section
      className={`home-hero${mounted ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <img className="home-hero__waves" src={wavesImage} alt="" aria-hidden="true" />

      <div className="home-hero__intro">
        <p className="home-hero__eyebrow">Award Government Contracts</p>
        <h1 className="home-hero__title">Procure with Confidence</h1>
        <p className="home-hero__lede">
          Supporting government agencies and public sector organisations with end-to-end
          procurement advisory, ensuring that contracts are awarded fairly, efficiently, and
          in line with best practice.
        </p>

        <div className="home-hero__actions">
          <a className="home-hero__btn" href="/book-a-consultation">
            <CircleIcon src={arrowIcon} size={30} />
            Book a Consultation
          </a>
          <a className="home-hero__btn" href="tel:+61478669922">
            <CircleIcon src={callIcon} size={30} />
            Whatsapp +61 478 669 922
          </a>
        </div>
      </div>

      <div
        ref={advisory.ref}
        className={`home-hero__advisory${advisory.inView ? ' is-in' : ''}`}
      >
        <div className="home-hero__advisory-text">
          <p className="home-hero__eyebrow">Advisory Services</p>
          <h2 className="home-hero__subtitle">Your Trusted Partner</h2>
          <p className="home-hero__advisory-copy">
            We help private sector organisations and suppliers strengthen their bids and win
            more contracts. Our end-to-end advisory services ensure your proposals are
            competitive, compliant, and compelling, giving you the edge in a highly contested
            marketplace.
          </p>

          <a className="home-hero__btn home-hero__btn--trailing" href="/book-a-consultation">
            Book a Consultation
            <CircleIcon src={arrowIcon} size={30} />
          </a>
        </div>

        <div className="home-hero__advisory-media">
          <img src={mainImage} alt="Advisory team meeting outdoors" />
        </div>
      </div>
    </section>
  );
}
