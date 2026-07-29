import PageLayout from '../../components/layout/PageLayout.jsx';
import JurisdictionsHero from '../../features/jurisdictions/components/JurisdictionsHero.jsx';
import JurisdictionsList from '../../features/jurisdictions/components/JurisdictionsList.jsx';

export default function JurisdictionalLinksPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <JurisdictionsHero />
        <JurisdictionsList />
      </PageLayout>
    </div>
  );
}
