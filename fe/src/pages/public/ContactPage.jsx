import PageLayout from '../../components/layout/PageLayout.jsx';
import ContactSection from '../../features/contact/components/ContactSection.jsx';

export default function ContactPage() {
  // Contact page has no win/award toggle and is pinned to the green theme.
  return (
    <PageLayout showToggle={false} audience="award">
      <ContactSection />
    </PageLayout>
  );
}
