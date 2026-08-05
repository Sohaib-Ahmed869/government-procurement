import PageLayout from '../../components/layout/PageLayout.jsx';
import AdvisoryHero from '../../features/advisory/components/AdvisoryHero.jsx';
import DeliverImpact from '../../features/advisory/components/DeliverImpact.jsx';
import { useAudience } from '../../context/AudienceContext.jsx';
import './AdvisoryServicesPage.css';

export default function AdvisoryServicesPage() {
  // Keying on the audience remounts each section when the toggle changes, so
  // the reveal animations replay.
  const { audience } = useAudience();

  return (
    <div className="advisory-scale">
      <PageLayout>
        <AdvisoryHero key={`adv-hero-${audience}`} />
        <DeliverImpact key={`adv-impact-${audience}`} />
      </PageLayout>
    </div>
  );
}
