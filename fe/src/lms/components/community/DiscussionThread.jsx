import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import VoteButtons from './VoteButtons.jsx';
import AnswerCard from './AnswerCard.jsx';
import DiscussionComposer from './DiscussionComposer.jsx';

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter((p) => !p.endsWith('.'));
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function on(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A full thread (L5): the question, then its replies with the accepted answer
// first, then the reply box.
export default function DiscussionThread({ thread, onVote, onReply, canAccept, onAccept }) {
  // Accepted answer to the top, then most-voted. Someone opening a thread wants
  // the answer, not the chronology.
  const replies = [...thread.replies].sort((a, b) => {
    if (a.accepted !== b.accepted) return a.accepted ? -1 : 1;
    return b.votes - a.votes;
  });

  return (
    <div>
      <article className="lms-question">
        <div className="lms-question__side">
          <VoteButtons
            votes={thread.votes}
            voted={thread.youVoted}
            onVote={() => onVote(null)}
            label="this question"
          />
        </div>

        <div className="lms-question__body">
          <div className="lms-question__meta">
            <Link className="lms-question__course" to={`/learn/courses/${thread.slug}`}>
              <LmsIcon name="book" />
              {thread.courseTitle}
            </Link>
            {thread.resolved ? (
              <span className="lms-pill lms-pill--done">
                <LmsIcon name="check" />
                Answered
              </span>
            ) : (
              <span className="lms-pill lms-pill--due">Awaiting an answer</span>
            )}
          </div>

          <h1 className="lms-question__title">{thread.title}</h1>
          <p className="lms-question__text">{thread.body}</p>

          <div className="lms-answer__author">
            <span className="lms-avatar">{initials(thread.author)}</span>
            <span>
              <span className="lms-answer__name">{thread.author}</span>
              <span className="lms-answer__when">asked {on(thread.createdAt)}</span>
            </span>
          </div>
        </div>
      </article>

      <h2 className="lms-thread__heading">
        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
      </h2>

      {replies.length ? (
        <ul className="lms-answers">
          {replies.map((r) => (
            <AnswerCard
              key={r.id}
              reply={r}
              onVote={() => onVote(r.id)}
              canAccept={canAccept}
              onAccept={() => onAccept(r.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="lms-empty">
          No replies yet. If you know the answer, it would help whoever finds this next.
        </p>
      )}

      <div className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="chat" />
            Your reply
          </h2>
        </div>
        <DiscussionComposer onSubmit={onReply} submitLabel="Post reply" />
      </div>
    </div>
  );
}
