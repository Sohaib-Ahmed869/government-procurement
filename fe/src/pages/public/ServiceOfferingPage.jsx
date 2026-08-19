import PageLayout from '../../components/layout/PageLayout.jsx';
import { useMountReveal } from '../../hooks/useMountReveal.js';
import ServiceRows from '../../features/serviceOffering/components/ServiceRows.jsx';
import { useAudience } from '../../context/AudienceContext.jsx';
import './ServiceOfferingPage.css';

// A5 — the page that used to be called Capabilities.
//
// Phase 0 scope is the route resolving and the six services rendering under the
// heading the brief fixes. The deeper visual and structural differentiation
// between the two segments is Phase 2; what is here already differs by segment
// because ServiceGrid re-sorts, re-marks and recolours itself from `audience`
// (see fe/src/features/serviceOffering/services.js).
//
// No eyebrow, and no "Capabilities" anywhere — both are explicit in A5.
const HEADINGS = {
  award: {
    title: 'Service Offering: Award Contracts',
    lede:
      'Six services that run the length of a procurement, from deciding how to go to market through to managing the contract you sign. They are listed here in the order a procurement is actually run.',
  },
  win: {
    title: 'Service Offering: Win Contracts',
    lede:
      'Six services covering the points where a bid is won or lost, from the decision to respond through to mobilising the contract you have taken. They are listed here in the order a bidder meets them.',
  },
};

export default function ServiceOfferingPage() {
  const { audience } = useAudience();
  const copy = HEADINGS[audience] || HEADINGS.award;
  // This header used to have no reveal at all: the title and lede simply
  // appeared while every other page's faded and lifted. Same hook, same
  // .hm-reveal, same --gp-reveal-* timings as the rest.
  const mounted = useMountReveal();

  return (
    <div className="page-scale">
      <PageLayout>
        <div className="so-page" data-audience={audience}>
          <header className={`so-page__head${mounted ? ' is-in' : ''}`}>
            <div className="so-page__shell">
              <h1 className="so-page__title hm-reveal">{copy.title}</h1>
              <p className="so-page__lede hm-reveal" data-delay="1">{copy.lede}</p>
            </div>
          </header>

          {/* Six rows, each with its photograph and copy, the sides and the band
              alternating down the page. The rows carry their own full-bleed
              backgrounds, so they sit outside the page shell. */}
          <ServiceRows audience={audience} />
        </div>
      </PageLayout>
    </div>
  );
}
