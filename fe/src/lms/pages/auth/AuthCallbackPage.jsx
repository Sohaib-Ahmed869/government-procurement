import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext.jsx';

/* Where the OAuth round trip lands (L6).

   The server put the session in the URL FRAGMENT. Two things happen here and
   the order matters:

     1. read it, before anything can navigate;
     2. strip it from the address bar with replaceState, so the token is not
        left sitting in the browser's history, in a screenshot, or in whatever
        the reader pastes into a support ticket.

   A fragment never reaches a server, so it stays out of access logs and Referer
   headers on the way in. It is still the weaker half of the design: an httpOnly
   cookie would also put the token beyond reach of any script on the page. That
   is a change to how every session in this app is stored, so it is written down
   as the next step rather than half-applied to one route. */
export default function AuthCallbackPage() {
  const { adoptSession } = useStudentAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // React 18 mounts twice in development. Adopting a session is not something
  // to do twice — the second pass would find an already-cleared fragment and
  // report a failure over a sign-in that worked.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');
    const role = params.get('role');
    const next = params.get('next') || '/learn';

    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      setError('That sign-in did not complete. Please try again.');
      return;
    }

    adoptSession(token, role)
      .then(() => navigate(next, { replace: true }))
      .catch(() => setError('We could not finish signing you in. Please try again.'));
  }, [adoptSession, navigate]);

  return (
    <div className="lms-auth">
      <div className="lms-auth__panel">
        <h1 className="lms-auth__title">{error ? 'Sign-in failed' : 'Signing you in…'}</h1>
        {error ? (
          <>
            <p className="lms-auth__sub">{error}</p>
            <button
              type="button"
              className="lms-btn lms-btn--primary lms-btn--block"
              onClick={() => navigate('/learn/login', { replace: true })}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="lms-auth__sub">One moment while we set up your session.</p>
        )}
      </div>
    </div>
  );
}
