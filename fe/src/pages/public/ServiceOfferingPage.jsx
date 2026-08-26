import PageLayout from '../../components/layout/PageLayout.jsx';
import { useMountReveal } from '../../hooks/useMountReveal.js';
import ServiceAccordion from '../../features/serviceOffering/components/ServiceAccordion.jsx';
import SegmentTitle from '../../components/shared/SegmentTitle.jsx';
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
// One title per segment. Rendered through SegmentTitle, which lays both out in
// the same grid cell so the heading band is the same height on either side and
// pressing the toggle does not resize the strip.
const TITLE_BY_AUDIENCE = {
  award: 'Service Offering: Award Contracts',
  win: 'Service Offering: Win Contracts',
};

export default function ServiceOfferingPage() {
  const { audience } = useAudience();
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
              <SegmentTitle
                className="so-page__title hm-reveal"
                titles={TITLE_BY_AUDIENCE}
                audience={audience}
                fallback="award"
              />
            </div>
          </header>

          {/* WIN only. On Award this page is a list of what the firm does for a
              buyer; on Win it is the syllabus of what the training covers, and
              a bidder arriving on it needs to be told that before they read the
              list as an offer to run their tender. Same box as the Sourcing
              Advisor's disclaimer — .gp-notice, shared from styles/notice.css
              so the two cannot drift apart. */}
          {audience === 'win' && (
            <div className="so-page__shell">
              <aside className="gp-notice so-page__notice" aria-label="Important information">
                <p className="gp-notice__lead">
                  We provide training in the function of tendering for government
                  contracts. The topics below are what that training covers.
                </p>
              </aside>
            </div>
          )}

          {/* The six services as a list of headings, one open at a time. It was
              six full-width photo rows, which showed one service per screen and
              never showed the visitor what the page held. */}
          <ServiceAccordion audience={audience} />
        </div>
      </PageLayout>
    </div>
  );
}
