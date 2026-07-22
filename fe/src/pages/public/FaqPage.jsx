import PageLayout from '../../components/layout/PageLayout.jsx';
import FaqAccordion from '../../features/faq/components/FaqAccordion.jsx';

export default function FaqPage() {
  return (
    <PageLayout showToggle={false} audience="award">
      <FaqAccordion />
    </PageLayout>
  );
}
