import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import photo from '../../../assets/images/EnhanceExpImage.png';
import './EnhanceExperience.css';

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

            <h2 className="ee__title">Enhance your Experience</h2>
            <p className="ee__copy">
              For over two decades, we've helped top organisations worldwide transform
              procurement through platforms, training, and consulting.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
