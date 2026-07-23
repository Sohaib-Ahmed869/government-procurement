import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

export default function InterestRegisteredPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <SystemMessage
          eyebrow="Interest registered"
          title="You're on the list"
          message="Thanks for registering your interest. We'll be in touch as soon as this course or programme opens for enrolment."
          actions={[
            { label: 'Browse courses', to: '/courses', variant: 'primary' },
            { label: 'Back to home', to: '/', variant: 'ghost' },
          ]}
        />
      </PageLayout>
    </div>
  );
}
