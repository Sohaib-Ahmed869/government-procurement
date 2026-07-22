import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

export default function ContactSentPage() {
  return (
    <PageLayout showToggle={false} audience="award">
      <SystemMessage
        eyebrow="Message sent"
        title="Thanks for reaching out"
        message="We've received your message and a member of our team will get back to you within two business days."
        actions={[
          { label: 'Back to home', to: '/', variant: 'primary' },
          { label: 'Explore courses', to: '/courses', variant: 'ghost' },
        ]}
      />
    </PageLayout>
  );
}
