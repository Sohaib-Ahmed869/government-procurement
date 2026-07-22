import PageLayout from '../../components/layout/PageLayout.jsx';
import AboutContent from '../../features/about/components/AboutContent.jsx';

export default function AboutPage() {
  return (
    <PageLayout showToggle={false} audience="award">
      <AboutContent />
    </PageLayout>
  );
}
