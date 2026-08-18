import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import RatingStars from './RatingStars.jsx';

// Write or edit a course review (L5). The rating is required and the written
// part is not. Most people will rate, and forcing prose is how you end up with
// "good" as your review corpus.
export default function ReviewForm({ courseTitle, review, onSave, onCancel }) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [title, setTitle] = useState(review?.title ?? '');
  const [body, setBody] = useState(review?.body ?? '');

  const submit = (e) => {
    e.preventDefault();
    if (!rating) return;
    onSave({ rating, title: title.trim(), body: body.trim() });
  };

  return (
    <form className="lms-reviewform" onSubmit={submit}>
      <p className="lms-reviewform__course">{courseTitle}</p>

      <div className="lms-reviewform__rating">
        <span className="lms-reviewform__label">Your rating</span>
        <RatingStars value={rating} onChange={setRating} size="lg" />
      </div>

      <input
        className="lms-input"
        value={title}
        placeholder="Sum it up in a line (optional)"
        aria-label="Review headline"
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="lms-textarea"
        rows={4}
        value={body}
        placeholder="What worked, what didn't, and who else would get value from it? (optional)"
        aria-label="Review"
        onChange={(e) => setBody(e.target.value)}
      />

      <div className="lms-composer__actions">
        <span className="lms-composer__hint">
          Reviews are public to other learners browsing the catalogue.
        </span>
        <div className="lms-reviewform__buttons">
          {onCancel ? (
            <button type="button" className="lms-btn lms-btn--sm" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="lms-btn lms-btn--sm lms-btn--primary" disabled={!rating}>
            <LmsIcon name="star" />
            {review ? 'Update review' : 'Post review'}
          </button>
        </div>
      </div>
    </form>
  );
}
