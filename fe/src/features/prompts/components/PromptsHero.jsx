import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './PromptsHero.css';

// B4 — the Prompt Library hero.
//
// The title alone. It used to carry a lede and a caveat about checking what a
// model gives back, both of which described the browse that starts immediately
// underneath — so they delayed the thing they described, and made this band
// twice the height of every other page's heading. The tool tag on each card is
// what tells you a prompt was written for Claude or ChatGPT, which is the part
// of that copy a visitor actually needed.
export default function PromptsHero() {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`pl-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="pl-hero__inner">
        <h1 className="pl-hero__title">AI Prompt Library</h1>
      </div>
    </section>
  );
}
