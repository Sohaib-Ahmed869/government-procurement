import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import photo from '../../../assets/images/EnhanceExpImage.png';

// The band directly under the hero: what the firm does, said once, for whichever
// side of the table the visitor is on.
//
// Both strings are written out rather than composed, because they are not the
// same sentence with two nouns swapped — a buyer is being told their process
// will stand up to scrutiny, and a supplier is being told theirs will score.
const COPY = {
  award: {
    body:
      'We help public sector teams get government procurement right, from shaping a sourcing strategy to running fair, defensible tenders that stand up to scrutiny. The result is stronger competition, better value for money, and outcomes that are transparent and easy to justify to stakeholders and auditors alike.',
    points: [
      'Sourcing strategy and approach to market',
      'Tender design and documentation',
      'Evaluation, probity and defensible award',
      'Capability building across the function',
    ],
  },
  win: {
    body:
      'We help private sector organisations and suppliers strengthen their bids and win more contracts, giving you the edge in a highly contested marketplace. Our advisers have sat on both sides of the table, evaluating bids and writing them. That experience turns into practical guidance you can act on, not theory.',
    points: [
      'Bid strategy and go / no-go decisions',
      'Response writing and pricing models',
      'Answering the evaluation criteria as scored',
      'Coaching your team through the next one',
    ],
  },
};

export default function TrustedPartner() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();
  const copy = COPY[audience] || COPY.award;

  return (
    <section
      ref={ref}
      id="trusted-partner"
      className={`hm-band hm-band--light-3 hm-band--hero-tail${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="trusted-partner-title"
    >
      <div className="hm-shell">
        <div className="hm-split">
          <div className="hm-split__media hm-reveal">
            <img src={photo} alt="Advisory team collaborating around a table" />
          </div>

          <div className="hm-split__body hm-reveal" data-delay="1">
            <h2 id="trusted-partner-title">Your Trusted Partner</h2>
            <p>{copy.body}</p>

            <ul className="hm-split__list">
              {copy.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>

            <Link className="hm-arrow" to="/service-offering">
              See how we work <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
