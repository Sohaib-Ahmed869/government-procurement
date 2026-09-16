import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './BidWritersHero.css';

// B7 — the Find a Bid Writer hero.
//
// The title alone, like every other page's heading band. Three things have
// gone from under it: a "Preview only" flag, the lede describing the
// directory that starts immediately below, and the paid-placement note. The
// flag is the one worth recording — it used to be drawn whenever the page's
// old build-time feature flag was set to its "preview" position, so anyone
// reviewing the unadvertised page saw a badge across the top of it. That flag
// is gone; whether the page is advertised is a Site Navigation toggle now,
// and while it's off the page is still marked noindex (FindBidWriterPage.jsx)
// without needing to say so on itself.
export default function BidWritersHero() {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`bw-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="bw-hero__inner">
        <h1 className="bw-hero__title">Find a Bid Writer</h1>
      </div>
    </section>
  );
}
