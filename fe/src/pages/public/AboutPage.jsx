import PageLayout from '../../components/layout/PageLayout.jsx';
import AboutContent from '../../features/about/components/AboutContent.jsx';

export default function AboutPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <AboutContent />
      </PageLayout>
    </div>
  );
}
