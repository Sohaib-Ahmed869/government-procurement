import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import ServiceGrid from '../../serviceOffering/components/ServiceGrid.jsx';

// The homepage's summary of the Service Offering page — the same six services,
// under the heading the brief fixes for each segment, with the page itself one
// click away. There is no "Capabilities" heading left anywhere (A5).
const HEADINGS = {
  award: {
    title: 'Service Offering: Award Contracts',
    lede:
      'Six services that run the length of a procurement, from deciding how to go to market through to managing the contract you sign.',
  },
  win: {
    title: 'Service Offering: Win Contracts',
    lede:
      'Six services covering the points where a bid is won or lost, from the decision to respond through to mobilising the contract you have taken.',
  },
};

export default function HomeServiceOffering() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();
  const copy = HEADINGS[audience] || HEADINGS.award;

  return (
    <section
      ref={ref}
      id="service-offering"
      className={`hm-band hm-band--dark-3${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-service-offering-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="home-service-offering-title">
          {copy.title}
        </h2>
        <p className="hm-band__lede">{copy.lede}</p>
      </div>

      <div className="hm-shell">
        <ServiceGrid audience={audience} compact />

        <Link className="hm-arrow" to="/service-offering">
          See the full service offering <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
