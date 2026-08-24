import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './TemplatesHero.css';

// B6 — the Templates library hero.
//
// The title alone. It used to carry a lede describing the library and a note
// about how its documents are sourced, both of which described the browse that
// starts immediately underneath — so they delayed the thing they described, and
// made this band twice the height of every other page's heading. What the lede
// told you (filter, download, edit in Office) the filter rail and the download
// buttons say better by being there.
export default function TemplatesHero() {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`tl-hero${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="tl-hero__inner">
        <h1 className="tl-hero__title">Templates</h1>
      </div>
    </section>
  );
}
