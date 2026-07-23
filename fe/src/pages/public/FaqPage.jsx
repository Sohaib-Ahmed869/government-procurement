import PageLayout from '../../components/layout/PageLayout.jsx';
import FaqHero from '../../features/faq/components/FaqHero.jsx';
import FaqAccordion from '../../features/faq/components/FaqAccordion.jsx';
import './FaqPage.css';

export default function FaqPage() {
  // Like the other inner pages, FAQ follows the win/award toggle: green for
  // Award, grey for Win.
  return (
    <div className="faq-scale">
      <PageLayout>
        <FaqHero />
        <FaqAccordion />
      </PageLayout>
    </div>
  );
}
