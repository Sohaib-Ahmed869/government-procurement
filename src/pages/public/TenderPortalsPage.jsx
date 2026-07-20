import PageLayout from '../../components/layout/PageLayout.jsx';
import TenderPortals from '../../features/tenders/components/TenderPortals.jsx';
import { useAudience } from '../../context/AudienceContext.jsx';
import './TenderPortalsPage.css';

export default function TenderPortalsPage() {
  // Keying on the audience remounts the section on toggle so the reveal replays.
  const { audience } = useAudience();

  return (
    <div className="tenders-scale">
      <PageLayout>
        <TenderPortals key={audience} />
      </PageLayout>
    </div>
  );
}
