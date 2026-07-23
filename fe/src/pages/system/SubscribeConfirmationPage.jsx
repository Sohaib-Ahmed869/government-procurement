import { useSearchParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

// Double opt-in landing: the confirmation link in the subscribe email lands
// here with a token. Backend verification is wired later; for now we reflect
// the confirmed state and echo the address when present.
export default function SubscribeConfirmationPage() {
  const [params] = useSearchParams();
  const email = params.get('email');

  return (
    <PageLayout>
      <SystemMessage
        eyebrow="Subscription confirmed"
        title="You're all subscribed"
        message={
          email
            ? `Thanks for confirming ${email}. You'll now receive our latest insights, courses, and procurement updates.`
            : "Thanks for confirming your subscription. You'll now receive our latest insights, courses, and procurement updates."
        }
        actions={[
          { label: 'Read insights', to: '/insights', variant: 'primary' },
          { label: 'Back to home', to: '/', variant: 'ghost' },
        ]}
      />
    </PageLayout>
  );
}
