import LmsIcon from '../LmsIcon.jsx';

// Upvote for a question or reply (L5). Deliberately one-directional. There is
// no downvote. In a professional learning community a downvote mostly
// discourages people from asking, and "this helped me" is the signal actually
// worth surfacing.
export default function VoteButtons({ votes, voted, onVote, label }) {
  return (
    <button
      type="button"
      className={`lms-vote${voted ? ' is-on' : ''}`}
      onClick={onVote}
      aria-pressed={voted}
      aria-label={`${voted ? 'Remove your vote from' : 'Upvote'} ${label}. ${votes} votes.`}
      title={voted ? 'Remove your vote' : 'This helped'}
    >
      <LmsIcon name="arrow" className="lms-vote__icon" />
      <span className="lms-vote__count">{votes}</span>
    </button>
  );
}
