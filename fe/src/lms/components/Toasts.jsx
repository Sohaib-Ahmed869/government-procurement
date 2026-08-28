import LmsIcon from './LmsIcon.jsx';
import { useToast } from '../context/ToastContext.jsx';

/* The toast viewport. Mounted once, by LmsRoutes, beside the provider.

   Two live regions rather than one, and the split matters for screen readers:
   `polite` waits for a pause before announcing, which is right for "Session
   scheduled"; `assertive` interrupts, which is right for a failure the reader
   would otherwise act on as though it had worked. Putting both tones in one
   region means choosing wrong for half of them. */

const ICON = { success: 'check', error: 'lock', info: 'clock' };

function ToastRow({ toast, onDismiss }) {
  return (
    <div className={`lms-toast lms-toast--${toast.tone}`}>
      <span className="lms-toast__icon">
        <LmsIcon name={ICON[toast.tone] ?? 'clock'} />
      </span>
      <div className="lms-toast__body">
        {toast.title ? <p className="lms-toast__title">{toast.title}</p> : null}
        <p className="lms-toast__message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="lms-toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        <LmsIcon name="plus" />
      </button>
    </div>
  );
}

export default function Toasts() {
  const { toasts, dismiss } = useToast();

  const polite = toasts.filter((t) => t.tone !== 'error');
  const urgent = toasts.filter((t) => t.tone === 'error');

  return (
    <div className="lms lms-toasts">
      <div aria-live="polite" aria-atomic="false" className="lms-toasts__region">
        {polite.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
      <div aria-live="assertive" aria-atomic="false" className="lms-toasts__region">
        {urgent.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  );
}
