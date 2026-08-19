import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import './PanelsCta.css';

// B2 — the band that closes the page, as the reference does.
//
// It earns its place here in a way it wouldn't on most pages: a visitor who has
// just read thirty panel appointments is at the exact point of asking "so how do
// I actually engage you under one of these", and the answer is a conversation.
// Sending them back up to the hero button for it would be the wrong ask at the
// right moment.
const COPY = {
  award:
    'If the arrangement you buy under is on this list, we can be engaged directly through it. If it isn’t, tell us how you buy and we will set out the options.',
  win:
    'We work inside these arrangements day to day. If you are bidding into one, we can tell you how the buyer is required to run it.',
};

export default function PanelsCta() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ threshold: 0 });

  return (
    <section
      ref={ref}
      className={`gp-cta${inView ? ' is-in' : ''}`}
      data-audience={audience}
      aria-labelledby="gp-cta-title"
    >
      <div className="gp-cta__inner">
        <div className="gp-cta__copy">
          <h2 className="gp-cta__title" id="gp-cta-title">
            Talk to us about engaging through a panel
          </h2>
          <p className="gp-cta__body">{COPY[audience] || COPY.award}</p>
        </div>

        <Link className="gp-cta__button" to="/book-a-consultation">
          Request a consultation
        </Link>
      </div>
    </section>
  );
}
