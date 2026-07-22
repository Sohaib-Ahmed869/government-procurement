import PageLayout from '../../components/layout/PageLayout.jsx';
import FaqHero from '../../features/faq/components/FaqHero.jsx';
import FaqAccordion from '../../features/faq/components/FaqAccordion.jsx';
import './FaqPage.css';

export default function FaqPage() {
  // Like the other inner pages, FAQ has no win/award toggle and is pinned to
  // the green theme.
  return (
    <div className="faq-scale">
      <PageLayout showToggle={false} audience="award">
        <FaqHero />
        <FaqAccordion />
      </PageLayout>
    </div>
  );
}
