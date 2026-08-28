import LmsIcon from '../LmsIcon.jsx';
import AuthLottie from './AuthLottie.jsx';

/* The panel beside the sign-in and sign-up forms.

   It replaces a flat green rectangle with one sentence in it, which used half
   the screen to say nothing a visitor could act on.

   Three layers, back to front: a geometric motif drawn from the subject
   (nested procurement thresholds), a Lottie animation of an online course, and
   the copy. The animation carries the warmth; the proof points do the work,
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
      {/* The animation. If its chunk fails to load, the motif beneath it is
          what the panel falls back to — see AuthLottie. */}
      <AuthLottie className="lms-authside__anim" />

      {/* Decorative, and marked as such: it carries no information the panel
          does not also say in words. */}
      <svg className="lms-authside__motif" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="gpFade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[190, 150, 110, 70, 34].map((r, i) => (
          <circle
            key={r}
            cx="200"
            cy="200"
            r={r}
            fill="none"
            stroke="url(#gpFade)"
            strokeWidth={i === 2 ? 1.6 : 0.8}
            strokeDasharray={i % 2 ? '2 7' : undefined}
          />
        ))}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <line
            key={deg}
            x1="200"
            y1="200"
            x2={200 + 190 * Math.cos((deg * Math.PI) / 180)}
            y2={200 + 190 * Math.sin((deg * Math.PI) / 180)}
            stroke="url(#gpFade)"
            strokeWidth="0.6"
          />
        ))}
        <circle cx="200" cy="200" r="5" fill="currentColor" fillOpacity="0.55" />
      </svg>

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
