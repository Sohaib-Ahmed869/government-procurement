import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

export default function QuestionSubmittedPage() {
  return (
    <PageLayout showToggle={false} audience="award">
      <SystemMessage
        eyebrow="Question submitted"
        title="Your question is in the queue"
        message="Thanks — your question has been submitted for review. Once our moderators approve and answer it, it'll appear in the forum."
        actions={[
          { label: 'Back to forum', to: '/forum', variant: 'primary' },
          { label: 'Ask another question', to: '/forum/submit', variant: 'ghost' },
        ]}
      />
    </PageLayout>
  );
}
