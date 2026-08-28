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
   the thing the visitor actually came to do. */
const PROOF = ['Recorded lectures', 'Marked assessments', 'Certificates'];

export default function AuthAside() {
  return (
    <aside className="lms-authside">
      {/* If its chunk fails to load this renders nothing and the panel is just
          the copy on the gradient, which is still a finished thing to look at.
          See AuthLottie. */}
      <AuthLottie className="lms-authside__anim" />

      <div className="lms-authside__body">
        <p className="lms-authside__eyebrow">Government Procurement Learning</p>
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
      </div>
    </aside>
  );
}
