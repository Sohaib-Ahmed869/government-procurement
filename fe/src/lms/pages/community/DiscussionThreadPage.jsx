import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import DiscussionThread from '../../components/community/DiscussionThread.jsx';
import { useThread } from '../../hooks/useDiscussions.js';

// One discussion thread (L5), from the API.
//
// The same record the course's instructor sees in their Questions inbox, so a
// reply posted there appears here on the next load and vice versa.
export default function DiscussionThreadPage() {
  const { threadId } = useParams();
  const { thread, status, error, reply, vote, accept } = useThread(threadId);
  const [actionError, setActionError] = useState('');

  // Wraps a write so a refusal is shown rather than swallowed. Voting your own
  // post and accepting an answer you aren't entitled to both come back as a
  // message worth reading.
  const guard = (fn) => async (...args) => {
    setActionError('');
    try {
      await fn(...args);
    } catch (err) {
      setActionError(err?.message ?? 'That didn’t go through.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="lms-card">
        <span className="lms-skel lms-skel--line" style={{ width: '50%', height: 22 }} />
        <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
      </div>
    );
  }

  if (status !== 'ready' || !thread) {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">
              {status === 'notfound' ? 'Discussion not found' : 'Couldn’t load this'}
            </h1>
            <p className="lms-page__subtitle">
              {status === 'notfound'
                ? 'This discussion doesn’t exist, or it’s on a course you’re not enrolled in.'
                : error}
            </p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/discussions">
          All discussions
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link className="lms-backlink" to={`/learn/discussions?course=${thread.slug}`}>
        <LmsIcon name="chevron" className="lms-backlink__icon" />
        All discussions
      </Link>

      {actionError ? <p className="lms-field__error">{actionError}</p> : null}

      <DiscussionThread
        thread={thread}
        onVote={guard(vote)}
        onReply={({ body }) => reply(body)}
        // The server works out whether THIS reader may mark an answer — the
        // client can't, since it would have to know who owns the course. It
        // enforces the rule on write regardless; this only keeps the button
        // away from people it would fail for.
        canAccept={thread.canAccept}
        onAccept={guard(accept)}
      />
    </div>
  );
}
