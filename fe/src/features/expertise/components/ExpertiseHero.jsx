import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import photo from '../../../assets/images/ExpertiseImage.png';
import './ExpertiseHero.css';

export default function ExpertiseHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal(audience);

  return (
    <section className={`xp${mounted ? ' is-in' : ''}`} data-audience={audience}>
      {/* Glass refraction filter driving the buttons' backdrop-filter.
          feDisplacementMap = refraction, feGaussianBlur = frost. Renders in
          Chromium; other engines fall back to the plain translucent glass. */}
      <svg className="xp__filters" aria-hidden="true" width="0" height="0">
        <filter id="xp-glass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.007 0.013" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.4" result="smoothNoise" />
          <feDisplacementMap in="SourceGraphic" in2="smoothNoise" scale="26" xChannelSelector="R" yChannelSelector="G" result="refracted" />
          <feGaussianBlur in="refracted" stdDeviation="1.4" />
        </filter>
      </svg>

      <img className="xp__photo" src={photo} alt="Mohammed Kheir" />

      <div className="xp__inner">
        <div className="xp__text">
          <h1 className="xp__name">Mohammed Kheir</h1>
          <p className="xp__role">Founder, Government Procurement</p>

          <div className="xp__actions">
            <a className="xp__btn" href="/book-a-consultation">
              Request a Consultation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
