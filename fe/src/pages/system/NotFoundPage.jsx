import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

export default function NotFoundPage() {
  return (
    <PageLayout>
      <SystemMessage
        code="404"
        eyebrow="Page not found"
        title="We couldn't find that page"
        message="The page you're looking for may have been moved, renamed, or never existed. Let's get you back on track."
        actions={[
          { label: 'Back to home', to: '/', variant: 'primary' },
          { label: 'Browse insights', to: '/insights', variant: 'ghost' },
        ]}
      />
    </PageLayout>
  );
}
