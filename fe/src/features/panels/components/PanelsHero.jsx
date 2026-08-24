import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './PanelsHero.css';

// B2 — the Government Panels hero.
//
// One title under both sides of the toggle, and the same words the nav uses to
// get here — a page whose heading does not match the link you followed reads as
// the wrong page for a moment.
//
// The title alone. The segment-specific lede and the consultation link that
// used to sit under it have been removed, and so has the CTA block that used to
// close the page: this is a credentials list, and it is left to be read as one.
// Anyone who wants to act on it reaches the consultation form from the nav and
// from the footer, which are on every page.
export default function PanelsHero() {
  const { audience } = useAudience();

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal();

  return (
    <section className={`gp-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="gp-hero__inner">
        <h1 className="gp-hero__title">
          Panel, Prequalification Schemes, and Direct Negotiation
        </h1>
      </div>
    </section>
  );
}
