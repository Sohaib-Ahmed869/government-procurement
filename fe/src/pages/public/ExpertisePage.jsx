import PageLayout from '../../components/layout/PageLayout.jsx';
import ExpertiseHero from '../../features/expertise/components/ExpertiseHero.jsx';
import AboutExpertise from '../../features/expertise/components/AboutExpertise.jsx';
import EnhanceBanner from '../../features/expertise/components/EnhanceBanner.jsx';
import './ExpertisePage.css';

export default function ExpertisePage() {
  // Expertise page has no win/award toggle and is pinned to the green theme.
  return (
    <div className="expertise-scale">
      <PageLayout>
        <ExpertiseHero />
        <AboutExpertise />
        <EnhanceBanner />
      </PageLayout>
    </div>
  );
}
