import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import bg from '../../../assets/images/OurexpertiseEnhance.png';
import './EnhanceBanner.css';

export default function EnhanceBanner() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();

  return (
    <section ref={ref} className={`eb${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="eb__inner">
        <div className="eb__card">
          <img className="eb__bg" src={bg} alt="" aria-hidden="true" />

          <div className="eb__content">
            <h2 className="eb__title">Enhance your Experience</h2>
            <p className="eb__copy">
              For over two decades, we've helped top organisations worldwide transform
              procurement through platforms, training, and consulting.
            </p>

            <div className="eb__actions">
              <Link className="eb__btn" to="/book-a-consultation">
                Request a Consultation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
