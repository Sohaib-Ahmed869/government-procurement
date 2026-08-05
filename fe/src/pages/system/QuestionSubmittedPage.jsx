import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

export default function QuestionSubmittedPage() {
  return (
    <div className="page-scale">
      <PageLayout>
        <SystemMessage
          eyebrow="Question submitted"
          title="Your question is in the queue"
          message="Thanks! Your question has been submitted for review. Once our moderators approve and answer it, it'll appear in the forum."
          actions={[
            { label: 'Back to Q&A', to: '/q-and-a', variant: 'primary' },
            { label: 'Ask another question', to: '/q-and-a/submit', variant: 'ghost' },
          ]}
        />
      </PageLayout>
    </div>
  );
}
