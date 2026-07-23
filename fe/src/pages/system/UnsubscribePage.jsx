import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import SystemMessage from '../../features/system/components/SystemMessage.jsx';

// Unsubscribe confirmation. The email link lands here with a token; the user
// confirms removal. The actual API call is wired later — for now the button
// flips to the confirmed state.
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get('email');
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <PageLayout>
        <SystemMessage
          eyebrow="Unsubscribed"
          title="You've been removed"
          message={
            email
              ? `${email} has been unsubscribed. You won't receive any further marketing emails from us.`
              : "You've been unsubscribed and won't receive any further marketing emails from us."
          }
          actions={[{ label: 'Back to home', to: '/', variant: 'primary' }]}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SystemMessage
        eyebrow="Unsubscribe"
        title="Sorry to see you go"
        message={
          email
            ? `Are you sure you want to unsubscribe ${email} from our mailing list?`
            : 'Are you sure you want to unsubscribe from our mailing list?'
        }
      >
        <button
          type="button"
          className="sysmsg__btn sysmsg__btn--primary"
          onClick={() => setDone(true)}
        >
          Yes, unsubscribe me
        </button>
      </SystemMessage>
    </PageLayout>
  );
}
