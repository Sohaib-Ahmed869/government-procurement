import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import callIcon from '../../../assets/icons/Call.png';
import bg from '../../../assets/images/OurexpertiseEnhance.png';
import wave from '../../../assets/images/EnhanceExpWave.png';
import './EnhanceBanner.css';

function CircleIcon({ src, size = 30 }) {
  return (
    <span className="eb__circle" aria-hidden="true">
      <img src={src} alt="" style={{ width: `${size}px`, height: `${size}px` }} />
    </span>
  );
}

export default function EnhanceBanner() {
  const { ref, inView } = useInView();
  const { audience } = useAudience();

  return (
    <section ref={ref} className={`eb${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="eb__inner">
        <div className="eb__card">
          <img className="eb__bg" src={bg} alt="" aria-hidden="true" />
          {/* Mobile-only corner wave, matching the homepage Enhance section. */}
          <img className="eb__wave" src={wave} alt="" aria-hidden="true" />

          <div className="eb__content">
            <h2 className="eb__title">Enhance your Experience</h2>
            <p className="eb__copy">
              For over two decades, we've helped top organisations worldwide transform
              procurement through platforms, training, and consulting.
            </p>

            <div className="eb__actions">
              <a className="eb__btn" href="/book-a-consultation">
                <CircleIcon src={arrowIcon} />
                Book a Consultation
              </a>
              <a className="eb__btn" href="tel:+61478669922">
                <CircleIcon src={callIcon} />
                Whatsapp +61 478 669 922
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
