import LmsIcon from '../LmsIcon.jsx';
import VoteButtons from './VoteButtons.jsx';

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter((p) => !p.endsWith('.'));
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function ago(iso) {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// One reply in a thread (L5). An instructor answer is marked as such, and an
// accepted one is lifted. Both matter because the reason someone opens a
// thread is to find the answer, not to read the conversation in order.
export default function AnswerCard({ reply, onVote, canAccept = false, onAccept }) {
  const isInstructor = reply.authorRole === 'instructor';

  return (
    <li className={`lms-answer${reply.accepted ? ' is-accepted' : ''}`}>
      <div className="lms-answer__side">
        <VoteButtons
          votes={reply.votes}
          voted={reply.youVoted}
          onVote={onVote}
          label={`reply from ${reply.author}`}
        />
      </div>

      <div className="lms-answer__body">
        {/* Marking the answer is what turns a thread from a conversation into
            something the next person can use. Offered only to whoever asked and
            to the course's instructor; accepting the accepted one clears it, so
            a mis-click is undoable without a second control. */}
        {reply.accepted ? (
          canAccept ? (
            <button
              type="button"
              className="lms-pill lms-pill--done lms-answer__accepted lms-answer__acceptbtn"
              onClick={onAccept}
              title="Unmark this as the answer"
            >
              <LmsIcon name="check" />
              Accepted answer
            </button>
          ) : (
            <span className="lms-pill lms-pill--done lms-answer__accepted">
              <LmsIcon name="check" />
              Accepted answer
            </span>
          )
        ) : canAccept ? (
          <button
            type="button"
            className="lms-btn lms-btn--sm lms-answer__acceptbtn"
            onClick={onAccept}
            title="Mark this as the answer"
          >
            <LmsIcon name="check" />
            Mark as the answer
          </button>
        ) : null}

        <div className="lms-answer__author">
          <span className={`lms-avatar${isInstructor ? ' is-instructor' : ''}`}>
            {initials(reply.author)}
          </span>
          <span>
            <span className="lms-answer__name">
              {reply.author}
              {isInstructor ? <span className="lms-badge-inst">Instructor</span> : null}
            </span>
            <span className="lms-answer__when">{ago(reply.createdAt)}</span>
          </span>
        </div>

        <p className="lms-answer__text">{reply.body}</p>
      </div>
    </li>
  );
}
