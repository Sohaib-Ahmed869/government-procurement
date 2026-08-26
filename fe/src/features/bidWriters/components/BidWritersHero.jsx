import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './BidWritersHero.css';

// B7 — the Find a Bid Writer hero.
//
// The title alone, like every other page's heading band. Three things have gone
// from under it: the "Preview only" flag, the lede describing the directory that
// starts immediately below, and the paid-placement note. The flag is the one
// worth recording — it was drawn whenever BID_WRITERS was 'preview', which is
// what local and staging run, so anyone reviewing the page saw a badge across
// the top of it. The page is still marked noindex on that setting; the page
// simply no longer says so on itself (see FindBidWriterPage.jsx).
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
