import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import callIcon from '../../../assets/icons/Call.png';
import photo from '../../../assets/images/EnhanceExpImage.png';
import wave from '../../../assets/images/EnhanceExpWave.png';
import './EnhanceExperience.css';

// White circle with a dark glyph, scaled to crop the PNG's transparent padding.
function CircleIcon({ src, size }) {
  return (
    <span className="ee__circle" aria-hidden="true">
      <img src={src} alt="" style={{ width: `${size}px`, height: `${size}px` }} />
    </span>
  );
}

export default function EnhanceExperience() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  return (
    <section
      ref={ref}
      className={`ee${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="ee__inner">
        <div className="ee__card">
          <div className="ee__media">
            <img src={photo} alt="Advisory team collaborating around a table" />
          </div>

          <div className="ee__content">
            <img className="ee__wave" src={wave} alt="" aria-hidden="true" />

            <h2 className="ee__title">Enhance your Experience</h2>
            <p className="ee__copy">
              For over two decades, we've helped top organisations worldwide transform
              procurement through platforms, training, and consulting.
            </p>

            <div className="ee__actions">
              <a className="ee__btn" href="/book-a-consultation">
                <CircleIcon src={arrowIcon} size={30} />
                Book a Consultation
              </a>
              <a className="ee__btn" href="tel:+61478669922">
                <CircleIcon src={callIcon} size={30} />
                Whatsapp +61 478 669 922
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
