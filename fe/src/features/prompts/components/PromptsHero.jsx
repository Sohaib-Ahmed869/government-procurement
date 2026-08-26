import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import SegmentTitle from '../../../components/shared/SegmentTitle.jsx';
import './PromptsHero.css';

// B4 — the Prompt Library hero.
//
// The title alone. It used to carry a lede and a caveat about checking what a
// model gives back, both of which described the browse that starts immediately
// underneath — so they delayed the thing they described, and made this band
// twice the height of every other page's heading. The tool tag on each card is
// what tells you a prompt was written for Claude or ChatGPT, which is the part
// of that copy a visitor actually needed.
//
// A title per segment. Win keeps the plain name of the page it is on; Award
// names what the library is FOR an agency — prompts that come with the
// engagement and are there to get work off a desk faster.
const TITLES = {
  win: 'AI Prompt Library',
  award: 'Complementary Master Prompts to Uplift Productivity',
};

export default function PromptsHero() {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`pl-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="pl-hero__inner">
        {/* Both titles are laid out and the longer one sizes the band, so the
            strip is the same height on either side of the toggle — see
            components/shared/SegmentTitle.jsx. */}
        <SegmentTitle
          className="pl-hero__title"
          titles={TITLES}
          audience={audience}
          fallback="win"
        />
      </div>
    </section>
  );
}
