import { useState } from 'react';
import { Link } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ReviewList from '../../components/community/ReviewList.jsx';
import ReviewForm from '../../components/community/ReviewForm.jsx';
import { useReviews } from '../../hooks/useReviews.js';

// Reviews and ratings (L5), from the API: what the learner has written, and
// what they're far enough through to review.
//
// The same records the course's instructor reads on their Reviews page, and the
// same ones the catalogue can quote — there is no second copy anywhere.
export default function ReviewsPage() {
  const { reviews, reviewable, threshold, status, error, save, remove } = useReviews();
  const [writing, setWriting] = useState(null); // course being reviewed
  const [saveError, setSaveError] = useState('');

  const average = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (status === 'loading') {
    return (
      <div>
        <div className="lms-page__head">
          <div><h1 className="lms-page__title">Reviews</h1></div>
        </div>
        <div className="lms-card">
          <span className="lms-skel lms-skel--line" style={{ width: '42%', height: 20 }} />
          <span className="lms-skel lms-skel--bar" style={{ marginTop: 18 }} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div>
        <div className="lms-page__head">
          <div><h1 className="lms-page__title">Reviews</h1></div>
        </div>
        <div className="lms-card"><p className="lms-empty">{error}</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="lms-page__head">
        <div>
          <h1 className="lms-page__title">Reviews</h1>
          <p className="lms-page__subtitle">
            {reviews.length
              ? `You've reviewed ${reviews.length} course${reviews.length === 1 ? '' : 's'}, averaging ${average} stars.`
              : 'Rate the courses you’ve taken to help other learners choose.'}
          </p>
        </div>
      </div>

      {/* Prompt first. The point of this page is getting reviews written. */}
      {reviewable.length ? (
        <section className="lms-card" style={{ marginBottom: 18 }}>
          <div className="lms-card__head">
            <h2 className="lms-card__title">
              <LmsIcon name="star" />
              Awaiting your review
            </h2>
            <span className="lms-card__note">
              {reviewable.length} course{reviewable.length === 1 ? '' : 's'}
            </span>
          </div>

          {writing ? (
            <>
              <ReviewForm
                courseTitle={reviewable.find((c) => c.slug === writing)?.title ?? ''}
                onCancel={() => { setWriting(null); setSaveError(''); }}
                onSave={async (next) => {
                  setSaveError('');
                  try {
                    await save({ slug: writing, ...next });
                    setWriting(null);
                  } catch (err) {
                    // The server can refuse: not enrolled, or not far enough
                    // through. Both are worth saying rather than swallowing.
                    setSaveError(err?.message ?? 'Could not post that review.');
                  }
                }}
              />
              {saveError ? <p className="lms-field__error">{saveError}</p> : null}
            </>
          ) : (
            <div className="lms-list">
              {reviewable.map((c) => (
                <div key={c.slug} className="lms-list__item">
                  <span className="lms-list__icon"><LmsIcon name="book" /></span>
                  <span className="lms-list__body">
                    <span className="lms-list__title">{c.title}</span>
                    <span className="lms-list__meta">{c.percent}% complete</span>
                  </span>
                  <button
                    type="button"
                    className="lms-btn lms-btn--sm lms-btn--primary"
                    onClick={() => setWriting(c.slug)}
                  >
                    <LmsIcon name="star" />
                    Write a review
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="lms-card">
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="chat" />
            Your reviews
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="lms-blank">
            <LmsIcon name="star" className="lms-blank__icon" />
            <h2>You haven’t reviewed anything yet</h2>
            <p>
              Once you’re {threshold}% through a course it appears above, ready to review.
              Your rating and comments show on the course in the catalogue.
            </p>
            <Link className="lms-btn lms-btn--primary" to="/learn/my-courses">
              Go to my courses
            </Link>
          </div>
        ) : (
          <ReviewList reviews={reviews} onSave={save} onRemove={remove} />
        )}
      </section>
    </div>
  );
}
