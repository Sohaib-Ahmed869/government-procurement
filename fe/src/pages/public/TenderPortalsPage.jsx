import PageLayout from '../../components/layout/PageLayout.jsx';
import TenderPortals from '../../features/tenders/components/TenderPortals.jsx';
import { useAudience } from '../../context/AudienceContext.jsx';
import './TenderPortalsPage.css';

export default function TenderPortalsPage() {
  useAudience();

  return (
    <div className="tenders-scale">
      {/* Tender portals are only relevant to the Win Contracts segment, so the
          page is pinned to win and the win/award toggle is hidden. */}
      <PageLayout>
        {/* No `key={audience}` here, and that is the fix for the toggle fade.
            Keying on the segment tore the whole section down and rebuilt it the
            moment the toggle was pressed, so the cross-fade in AudienceContext
            had nothing left to fade — the page snapped instead of dissolving,
            which is why this page behaved differently from every other one. The
            homepage dropped the same trick for the same reason; the reveals
            replay from their own `resetKey` without needing a remount. */}
        <TenderPortals />
      </PageLayout>
    </div>
  );
}
