import PageLayout from '../../components/layout/PageLayout.jsx';
import ContactSection from '../../features/contact/components/ContactSection.jsx';

export default function ContactPage() {
  // Contact follows the win/award toggle: green for Award, grey for Win.
  return (
    <div className="page-scale">
      <PageLayout>
        <ContactSection />
      </PageLayout>
    </div>
  );
}
