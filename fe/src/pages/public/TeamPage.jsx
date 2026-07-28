import PageLayout from '../../components/layout/PageLayout.jsx';
import TeamHero from '../../features/team/components/TeamHero.jsx';
import TeamGrid from '../../features/team/components/TeamGrid.jsx';

export default function TeamPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <TeamHero />
        <TeamGrid />
      </PageLayout>
    </div>
  );
}
