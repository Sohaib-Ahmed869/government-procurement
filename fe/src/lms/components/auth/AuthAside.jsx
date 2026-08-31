import { Link } from 'react-router-dom';
import LmsIcon from '../LmsIcon.jsx';
import AuthLottie from './AuthLottie.jsx';

/* The panel beside the sign-in and sign-up forms.

   It replaces a flat green rectangle with one sentence in it, which used half
   the screen to say nothing a visitor could act on.

   Two layers: a Lottie animation of an online course, and the copy. There was
   a geometric motif behind them as well — it read as stray circles rather than
   as pattern, and with a real illustration in place it had nothing left to do.
   The animation carries the warmth; the proof points do the work,
   answering "what do I get" at the moment somebody decides whether creating an
   account is worth it.

   The animation is from LottieFiles, recoloured onto the brand palette by
   scripts/recolour-lottie.mjs rather than hand-edited across 57 layers. That
   script deliberately leaves skin tones and neutrals alone — turning a person's
   face green is the failure mode of every automated palette swap. */

/* Three words each. This panel is read in a glance on the way to the form, not
   studied — the earlier two-line descriptions were a brochure competing with
   the thing the visitor actually came to do.

   There is no eyebrow over the lede any more. It read "Government Procurement
   Learning", which is the wordmark the form column already carries two inches
   to the left — the panel was introducing a brand the visitor is looking
   straight at. The lede opens the panel instead. */
const PROOF = ['Recorded lectures', 'Marked assessments', 'Certificates'];

/* `showInternalSignIn` puts a way through to the sign-in page at the foot of
   the panel. The sign-up form creates learner accounts and nothing else now, so
   an instructor who lands on it has no row to fill in — this is the line that
   tells them where they actually go, without putting a second call to action
   next to the one the page is for.

   Off by default, and off on the sign-in page in particular: a link to the page
   you are already on is furniture. */
export default function AuthAside({ showInternalSignIn = false }) {
  return (
    <aside className="lms-authside">
      {/* If its chunk fails to load this renders nothing and the panel is just
          the copy on the gradient, which is still a finished thing to look at.
          See AuthLottie. */}
      <AuthLottie className="lms-authside__anim" />

      <div className="lms-authside__body">
        <h2 className="lms-authside__lede">
          The rules, the practice, and the record that stands up to review.
        </h2>
        <ul className="lms-authside__proof">
          {PROOF.map((item) => (
            <li key={item}>
              <LmsIcon name="check" />
              {item}
            </li>
          ))}
        </ul>

        {showInternalSignIn ? (
          <p className="lms-authside__internal">
            <span>Instructor?</span>
            <Link className="lms-authside__internal-link" to="/learn/login">
              Internal sign in
              <LmsIcon name="chevron" />
            </Link>
          </p>
        ) : null}
      </div>
    </aside>
  );
}
