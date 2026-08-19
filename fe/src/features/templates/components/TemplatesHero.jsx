import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './TemplatesHero.css';

// B6 — the Templates library hero.
//
// The note under the lede is not boilerplate. Every document here is sourced
// from somewhere and published only once its licence has been checked, and
// saying so is both the honest position and the reason the library fills slowly.
const COPY = {
  award:
    'Working documents for running a procurement: plans, evaluation tools, registers and checklists. Filter to what you are doing, download the file, and edit it in Word, Excel or PowerPoint.',
  win:
    'Working documents for responding to a tender: response plans, compliance checklists, pricing and capability tools. Filter to what you are doing, download the file, and edit it in Word, Excel or PowerPoint.',
};

export default function TemplatesHero() {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`tl-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="tl-hero__inner">
        <h1 className="tl-hero__title">Templates</h1>
        <p className="tl-hero__sub">{COPY[audience] || COPY.award}</p>
        <p className="tl-hero__note">
          Every document is sourced and its licence checked before it is published.
          Files download in their original format so you can edit them; nothing here
          is converted to PDF.
        </p>
      </div>
    </section>
  );
}
