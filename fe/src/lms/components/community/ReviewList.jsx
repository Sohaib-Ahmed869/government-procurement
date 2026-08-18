import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import RatingStars from './RatingStars.jsx';
import ReviewForm from './ReviewForm.jsx';

function on(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// `onSave` and `onRemove` come from the page rather than being imported here.
// They now go to the API, which can refuse — a review below the progress
// threshold, or one that isn't yours — so the caller owns the error.
function ReviewItem({ review, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  if (editing) {
    return (
      <li className="lms-review">
        <ReviewForm
          courseTitle={review.courseTitle}
          review={review}
          onCancel={() => setEditing(false)}
          onSave={async (next) => {
            setError('');
            try {
              await onSave({ slug: review.slug, ...next });
              setEditing(false);
            } catch (err) {
              setError(err?.message ?? 'Could not save that.');
            }
          }}
        />
        {error ? <p className="lms-field__error">{error}</p> : null}
      </li>
    );
  }

  return (
    <li className="lms-review">
      <div className="lms-review__head">
        <div>
          <Link className="lms-review__course" to={`/learn/courses/${review.slug}`}>
            {review.courseTitle}
          </Link>
          <div className="lms-review__rating">
            <RatingStars value={review.rating} />
            <span className="lms-review__date">
              {review.updatedAt !== review.createdAt ? 'Edited ' : ''}
              {on(review.updatedAt)}
            </span>
          </div>
        </div>

        <div className="lms-note__actions">
          {confirming ? (
            <>
              <span className="lms-note__confirm">Delete this review?</span>
              <button type="button" className="lms-btn lms-btn--sm" onClick={() => setConfirming(false)}>
                Keep
              </button>
              <button
                type="button"
                className="lms-btn lms-btn--sm lms-btn--danger"
                onClick={async () => {
                  setError('');
                  try {
                    await onRemove(review.id);
                  } catch (err) {
                    setConfirming(false);
                    setError(err?.message ?? 'Could not delete that.');
                  }
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost" onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {review.title ? <h3 className="lms-review__title">{review.title}</h3> : null}
      {review.body ? <p className="lms-review__body">{review.body}</p> : null}
      {!review.title && !review.body ? (
        <p className="lms-review__body lms-review__body--empty">
          <LmsIcon name="star" />
          Rating only, no written review.
        </p>
      ) : null}

      {error ? <p className="lms-field__error">{error}</p> : null}
    </li>
  );
}

export default function ReviewList({ reviews, onSave, onRemove }) {
  return (
    <ul className="lms-reviews">
      {reviews.map((r) => (
        <ReviewItem key={r.id} review={r} onSave={onSave} onRemove={onRemove} />
      ))}
    </ul>
  );
}
