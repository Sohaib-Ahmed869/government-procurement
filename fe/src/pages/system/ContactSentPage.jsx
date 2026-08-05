import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

export default function ContactSentPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <SystemMessage
          eyebrow="Message sent"
          title="Thanks for reaching out"
          message="We've received your message and a member of our team will get back to you within two business days."
        />
      </PageLayout>
    </div>
  );
}
