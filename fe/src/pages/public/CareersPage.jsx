import PageLayout from '../../components/layout/PageLayout.jsx';
import CareersHero from '../../features/careers/components/CareersHero.jsx';
import CareersContent from '../../features/careers/components/CareersContent.jsx';

export default function CareersPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <CareersHero />
        <CareersContent />
      </PageLayout>
    </div>
  );
}
