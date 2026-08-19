import './AdvisorDisclaimer.css';

// A6.9 / A6.10 — the disclaimer.
//
// The wording is the tracker's, and only the tracker's: "not AI-powered, no
// data stored or used for training". An earlier version of this file also
// carried a "guide, not legal advice" line and an explanation of how the tool
// works. Neither was asked for, and a disclaimer that says more than it was
// given to say is the author editorialising on the client's behalf.
//
// Rendered by the stepper before the first question and again on the result, so
// it is on screen at both ends of every use rather than filed once in a footer.
// `variant` only changes the spacing around it, not the words.
export default function AdvisorDisclaimer({ variant = 'intro' }) {
  return (
    <aside className={`adv-disclaimer adv-disclaimer--${variant}`} aria-label="Important information">
      <p className="adv-disclaimer__lead">
        <strong>This tool is not AI-powered.</strong> No data is stored or used for
        training.
      </p>
    </aside>
  );
}
