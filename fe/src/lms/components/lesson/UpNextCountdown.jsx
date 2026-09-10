import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import { lessonHref } from '../../utils/lessonHref.js';

/* What happens when a video runs out.

   A lecture that simply stops leaves the learner on a dead frame with a Next
   button somewhere below the fold. This carries them on instead, and says
   plainly what it is about to do and how long they have to stop it.

   FIVE seconds, and a cancel. Long enough to read the next lesson's name and
   decide against it; short enough that sitting through it isn't a wait. It also
   cancels itself on any keypress or click inside the panel, because somebody
   reaching for "Stay here" has already decided.

   It is deliberately NOT an autoplay of the next video — it navigates, and the
   next lesson decides for itself whether to play. Chaining autoplay across a
   whole module is how people end up three lectures further on than they meant
   to be. */
const SECONDS = 5;

export default function UpNextCountdown({ slug, next, onDismiss }) {
  const navigate = useNavigate();
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    // One interval, and the navigation happens in the render-safe effect below
    // rather than inside the tick — setState during a timer is fine, routing is
    // better done once the count has actually reached zero in state.
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left > 0) return;
    navigate(lessonHref(slug, next));
  }, [left, navigate, slug, next]);

  const kindWord = next.kind === 'quiz' ? 'quiz' : next.kind === 'doc' ? 'reading' : 'lesson';

  return (
    <div className="lms-upnext" role="status" aria-live="polite">
      <span className="lms-upnext__ring" aria-hidden="true">
        {/* Counts DOWN visually as well as in words: the ring empties, so the
            time left is readable without reading. */}
        <svg viewBox="0 0 36 36">
          <circle className="lms-upnext__track" cx="18" cy="18" r="16" />
          <circle
            className="lms-upnext__sweep"
            cx="18"
            cy="18"
            r="16"
            style={{ strokeDashoffset: 100.5 * (1 - Math.max(left, 0) / SECONDS) }}
          />
        </svg>
        <span className="lms-upnext__count">{Math.max(left, 0)}</span>
      </span>

      <span className="lms-upnext__body">
        <span className="lms-upnext__label">Next {kindWord}</span>
        <span className="lms-upnext__title">{next.title}</span>
      </span>

      <span className="lms-upnext__actions">
        <button
          type="button"
          className="lms-btn lms-btn--sm lms-btn--ghost"
          onClick={onDismiss}
        >
          Stay here
        </button>
        <button
          type="button"
          className="lms-btn lms-btn--sm lms-btn--primary"
          onClick={() => navigate(lessonHref(slug, next))}
        >
          Go now
          <LmsIcon name="arrow" />
        </button>
      </span>
    </div>
  );
}
