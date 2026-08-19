import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { BID_WRITERS } from '../../../config/features.js';
import './BidWritersHero.css';

// B7 — the Find a Bid Writer hero.
export default function BidWritersHero() {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`bw-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="bw-hero__inner">
        {/* Only ever rendered on the preview setting, and only visible to
            whoever is looking at staging. It is here so nobody reviewing the
            page mistakes it for something the public can reach. */}
        {BID_WRITERS === 'preview' && (
          <p className="bw-hero__flag">
            Preview only — this page is not live and is marked noindex
          </p>
        )}

        <h1 className="bw-hero__title">Find a Bid Writer</h1>
        <p className="bw-hero__sub">
          Bid management companies that write and manage tender responses, listed by
          where their office is and the categories they work across. Filter to your
          state and the kind of work, then contact them directly.
        </p>
        <p className="bw-hero__note">
          These are paid placements. We do not endorse or recommend any company listed,
          and we take no commission on work you engage them for.
        </p>
      </div>
    </section>
  );
}
