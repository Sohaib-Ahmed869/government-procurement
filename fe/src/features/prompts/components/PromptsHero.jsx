import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './PromptsHero.css';

// B4 — the Prompt Library hero.
//
// The lede has one job beyond describing the page: setting the expectation that
// what you get here is a prompt, not an answer. Everything below is something
// you copy and run yourself.
const COPY = {
  award:
    'Master prompts for the work of buying: shaping a procurement, drafting evaluation criteria, testing a specification before it goes out. Pick a use case, copy the prompt, and run it in the tool it was written for.',
  win:
    'Master prompts for the work of bidding: reading a tender, planning a response, sharpening a capability statement. Pick a use case, copy the prompt, and run it in the tool it was written for.',
};

export default function PromptsHero() {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`pl-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="pl-hero__inner">
        <h1 className="pl-hero__title">AI Prompt Library</h1>
        <p className="pl-hero__sub">{COPY[audience] || COPY.award}</p>
        <p className="pl-hero__note">
          Written and tested for ChatGPT, Claude and Gemini. Always check what comes
          back before you rely on it. A prompt shapes an answer, it does not
          guarantee one.
        </p>
      </div>
    </section>
  );
}
