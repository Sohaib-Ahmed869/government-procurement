import LmsIcon from '../LmsIcon.jsx';

/* The panel beside the sign-in and sign-up forms.

   It replaces a flat green rectangle with one sentence in it, which used half
   the screen to say nothing a visitor could act on.

   No stock illustration of smiling people at a laptop: the audience is
   procurement officers and bid teams, and a drawing of somebody else's office
   is decoration. The motif below is drawn from the subject instead — a set of
   nested procurement thresholds, the shape of the thing being taught — and the
   panel's real job is the three proof points, which answer "what do I get" at
   the moment somebody is deciding whether to bother creating an account. */

const PROOF = [
  { icon: 'video', title: 'Recorded lectures', text: 'Watch at your own pace, on any device.' },
  { icon: 'quiz', title: 'Scenario assessments', text: 'Marked instantly, with the reasoning for every answer.' },
  { icon: 'award', title: 'Certificates', text: 'Issued on completion, with a verifiable credential ID.' },
];

export default function AuthAside() {
  return (
    <aside className="lms-authside">
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
        <p className="lms-authside__sub">
          Structured courses on Australian government procurement, written by people who
          have run the process from both sides of the table.
        </p>

        <ul className="lms-authside__proof">
          {PROOF.map((item) => (
            <li key={item.title}>
              <span className="lms-authside__icon">
                <LmsIcon name={item.icon} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
