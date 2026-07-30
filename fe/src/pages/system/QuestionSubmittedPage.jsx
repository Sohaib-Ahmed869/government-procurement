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
            { label: 'Back to QnA', to: '/qna', variant: 'primary' },
            { label: 'Ask another question', to: '/qna/submit', variant: 'ghost' },
          ]}
        />
      </PageLayout>
    </div>
  );
}
