import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import JurisdictionPicker from '../../advisor/components/JurisdictionPicker.jsx';
import './AdvisoryBand.css';
import Arrow from '../../../components/shared/Arrow.jsx';

// A6's homepage entry — the Procurement Advisor, summarised.
//
// The jurisdiction boxes are the tool's own picker, rendered here rather than
// re-drawn: same component, same stylesheet, same list out of jurisdictions.js.
// They used to be a second design over a hardcoded NSW/VIC/QLD, which meant the
// band both looked different from the page it leads to and named two
// jurisdictions the tool has never offered.
//
// The disclaimer line is deliberate: the tool carries it on every use, and
// softening it on the way in would set the wrong expectation about what the
// thing is.
const COPY = {
  award: 'Answer a short series of questions about what you are buying and how much you expect to spend, and the advisor points you to the approach to market the rules require.',
  win: 'Answer a short series of questions about the opportunity in front of you, and the advisor sets out the process the buyer has to run, so you know what is coming and when.',
};

export default function AdvisoryBand() {
  const { audience } = useAudience();
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      id="advisory"
      className={`hm-band hm-band--light${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="home-advisory-title"
    >
      <div className="hm-shell hm-band__head hm-reveal">
        <h2 className="hm-band__title" id="home-advisory-title">
          Check the rules before you go to market
        </h2>
        <p className="hm-band__lede">{COPY[audience] || COPY.award}</p>
      </div>

      <div className="hm-shell">
        <JurisdictionPicker itemClassName="hm-reveal" />

        {/* Same wording as the tool's own disclaimer (A6). */}
        <p className="ab__note">
          Not AI-powered. No data is stored or used for training.
        </p>

        <Link className="hm-arrow" to="/advisory">
          Open the Sourcing Advisor <Arrow />
        </Link>
      </div>
    </section>
  );
}
