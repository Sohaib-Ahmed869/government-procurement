import { Link } from 'react-router-dom';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './PanelsHero.css';

// B2 — the Government Panels hero.
//
// The lede has to do one job: say that the list below is a way to buy, not a
// directory of panels to apply to. "Engaged through" is the phrase that does it,
// and it is the phrase the reference page leads with too.
//
// The copy differs by segment because the two arrive for different reasons. A
// buyer wants to know they can appoint us without running a procurement. A
// bidder wants to know we work inside these arrangements and know how they run.
const COPY = {
  award:
    'We have delivered procurement, probity and advisory services to Commonwealth, State and Local Government clients. Where you already buy through one of the arrangements below, we can be engaged directly under it, with no separate approach to market required.',
  win:
    'We have delivered procurement, probity and advisory services to Commonwealth, State and Local Government clients. The arrangements below are the panels and schemes we hold, and the ones we work inside day to day when we advise on how a buyer will run their process.',
};

export default function PanelsHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal();

  return (
    <section className={`gp-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="gp-hero__inner">
        <h1 className="gp-hero__title">Government Panels</h1>
        <p className="gp-hero__sub">{COPY[audience] || COPY.award}</p>

        {/* The page's whole purpose is "engage us through one of these", so the
            action belongs at the top with the promise rather than only at the
            bottom after thirty rows. */}
        <Link className="gp-hero__cta" to="/book-a-consultation">
          Talk to us today
        </Link>
      </div>
    </section>
  );
}
