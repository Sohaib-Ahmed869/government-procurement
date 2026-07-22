import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

export default function ServerErrorPage() {
  return (
    <PageLayout showToggle={false} audience="award">
      <SystemMessage
        code="500"
        eyebrow="Something went wrong"
        title="An unexpected error occurred"
        message="Our team has been notified. Please try again in a few moments. If the problem persists, get in touch and we'll help."
        actions={[
          { label: 'Try again', href: '/', variant: 'primary' },
          { label: 'Contact us', to: '/contact', variant: 'ghost' },
        ]}
      />
    </PageLayout>
  );
}
