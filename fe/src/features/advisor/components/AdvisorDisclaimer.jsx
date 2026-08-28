import { Link } from 'react-router-dom';
import './AdvisorDisclaimer.css';

// A6.9 / A6.10 — the disclaimer.
//
// The wording is the client's, verbatim. It carries four things: that the tool
// is not AI-powered, that nothing you type is collected, that what it applies
// are fixed rules for the jurisdiction you picked, and that general guidance is
// not advice. Privacy and Terms are linked rather than named, so the sentence
// that points at them can be acted on from here.
//
// Rendered by the stepper before the first question and again on the result, so
// it is on screen at both ends of every use rather than filed once in a footer.
// `variant` only changes the spacing around it, not the words.
// Defaults to `result`, which is the only variant still rendered and the only
// one with spacing rules left. A caller that wants it somewhere else should say
// so explicitly rather than inherit a variant that styles nothing.
export default function AdvisorDisclaimer({ variant = 'result' }) {
  return (
    <aside
      className={`gp-notice adv-disclaimer adv-disclaimer--${variant}`}
      aria-label="Important information"
    >
      {/* One paragraph, not two. Split, "The guidance provided…" began a block
          of its own and read as a second, separate notice; it is the same
          statement continuing, so it continues on the same line and wraps
          wherever the box happens to end. */}
      <p className="gp-notice__lead">
        <strong>This tool is not AI-powered</strong> and does not collect any data
        about you or what you enter. It applies fixed, hard-coded sourcing rules for
        the jurisdiction you select. The guidance provided is general in nature and is
        not a substitute for legal, financial, probity or procurement advice. For more
        information, see our <Link to="/policies/privacy">Privacy Policy</Link> and{' '}
        <Link to="/policies/terms">Terms of Use</Link>.
      </p>
    </aside>
  );
}
