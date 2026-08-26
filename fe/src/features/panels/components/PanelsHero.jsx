import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import SegmentTitle from '../../../components/shared/SegmentTitle.jsx';
import './PanelsHero.css';

// B2 — the Government Panels hero.
//
// A title per segment, because the two sides of this page are not the same
// page. WIN is a supplier, and what is under the heading is a list of services
// with a way to start each one — "Talk to Us Directly" is the invitation that
// describes it. AWARD is a government buyer, and what is under the heading is
// the set of arrangements we can be appointed under, so it names them.
//
// The title alone. The segment-specific lede and the consultation link that
// used to sit under it have been removed, and so has the CTA block that used to
// close the page: this is a credentials list, and it is left to be read as one.
// Anyone who wants to act on it reaches the consultation form from the nav and
// from the footer, which are on every page.
const TITLES = {
  win: 'Talk to Us Directly',
  award: 'Panel, Prequalification, Direct Negotiation, and Contractor',
};

export default function PanelsHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal();

  return (
    <section className={`gp-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="gp-hero__inner">
        {/* SegmentTitle, not a plain h1: the two titles are very different
            lengths, so one wraps where the other does not and the strip changed
            height every time the toggle was pressed. */}
        <SegmentTitle
          className="gp-hero__title"
          titles={TITLES}
          audience={audience}
          fallback="award"
        />
      </div>
    </section>
  );
}
