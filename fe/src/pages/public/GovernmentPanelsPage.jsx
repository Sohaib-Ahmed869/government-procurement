import PageLayout from '../../components/layout/PageLayout.jsx';
import PanelsHero from '../../features/panels/components/PanelsHero.jsx';
import PanelsList from '../../features/panels/components/PanelsList.jsx';
import EngageServices from '../../features/panels/components/EngageServices.jsx';
import { useAudience } from '../../context/AudienceContext.jsx';

/* B2 — how a client can engage us. The page answers a different question on
   each side of the toggle, because the two are not in the same position.

   AWARD, a government buyer: the panels and schemes we hold an appointment on.
   If they already purchase under one, they can appoint us directly under it
   with no separate approach to market. That is a credentials list, and it is
   what PanelsList renders.

   WIN, a supplier or bidder: panels are how government BUYS, not a route a
   bidder can use, so the same list would answer a question they never asked.
   What they need is which services we run for them and how to start one —
   EngageServices, a row per service with call, email and consultation on it.

   Every panel entry is CMS content (Content → Government Panels), including the
   headings, which are free text so a local council that runs its own panel can
   have one of its own. */
export default function GovernmentPanelsPage() {
  const { audience } = useAudience();

  return (
    <div className="page-scale">
      <PageLayout>
        <PanelsHero />
        {audience === 'win' ? <EngageServices audience={audience} /> : <PanelsList />}
      </PageLayout>
    </div>
  );
}
