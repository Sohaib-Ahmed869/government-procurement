import PageLayout from '../../components/layout/PageLayout.jsx';
import { useMountReveal } from '../../hooks/useMountReveal.js';
import ServiceAccordion from '../../features/serviceOffering/components/ServiceAccordion.jsx';
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
  award: { title: 'Service Offering: Award Contracts' },
  win: { title: 'Service Offering: Win Contracts' },
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
              {/* The title alone. The lede described the six rows that begin
                  immediately below it, so it delayed the thing it described. */}
              <h1 className="so-page__title hm-reveal">{copy.title}</h1>
            </div>
          </header>

          {/* The six services as a list of headings, one open at a time. It was
              six full-width photo rows, which showed one service per screen and
              never showed the visitor what the page held. */}
          <ServiceAccordion audience={audience} />
        </div>
      </PageLayout>
    </div>
  );
}
