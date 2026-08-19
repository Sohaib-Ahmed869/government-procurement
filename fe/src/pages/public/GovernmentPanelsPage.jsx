import PageLayout from '../../components/layout/PageLayout.jsx';
import PanelsHero from '../../features/panels/components/PanelsHero.jsx';
import PanelsList from '../../features/panels/components/PanelsList.jsx';
import PanelsCta from '../../features/panels/components/PanelsCta.jsx';

// B2 — the panels and prequalification schemes we can be engaged through.
//
// A credentials page, not a directory: every row is an arrangement we hold an
// appointment on, so a client who already buys under one can appoint us
// directly. That distinction is the whole page — it decides the copy, why there
// are no "open to new suppliers" labels, and why the list is not filterable.
//
// Every entry is CMS content (Content → Government Panels), including the
// headings, which are free text so a local council that runs its own panel can
// have one of its own.
export default function GovernmentPanelsPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <PanelsHero />
        <PanelsList />
        <PanelsCta />
      </PageLayout>
    </div>
  );
}
