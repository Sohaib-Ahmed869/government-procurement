import PageLayout from '../../components/layout/PageLayout.jsx';
import InsightsHero from '../../features/insights/components/InsightsHero.jsx';
import InsightsGrid from '../../features/insights/components/InsightsGrid.jsx';
import './InsightsPage.css';

export default function InsightsPage() {
  // Like courses, insights has no win/award toggle and is pinned to the green theme.
  return (
    <div className="insights-scale">
      <PageLayout>
        <InsightsHero />
        <InsightsGrid />
      </PageLayout>
    </div>
  );
}
