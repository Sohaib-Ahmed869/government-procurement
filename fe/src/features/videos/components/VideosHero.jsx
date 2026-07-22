import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import './VideosHero.css';

export default function VideosHero() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });

  return (
    <section
      ref={ref}
      className={`videos-hero${inView ? ' is-in' : ''}`}
      data-audience={audience}
    >
      <div className="videos-hero__inner">
        <h1 className="videos-hero__title">Videos</h1>
        <p className="videos-hero__subtitle">
          Watch short explainers, strategy deep-dives, and recorded webinars on
          smarter government procurement — filter by platform and topic to find
          what you need.
        </p>
      </div>
    </section>
  );
}
