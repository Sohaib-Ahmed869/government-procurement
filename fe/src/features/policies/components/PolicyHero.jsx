import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import './PolicyHero.css';

// The shared page-heading band, used by the policy index. Individual policies
// do not use it: a document opens on its own title.
export default function PolicyHero({ title, intro }) {
  const { audience } = useAudience();
  const mounted = useMountReveal();

  return (
    <section className={`polh${mounted ? ' is-in' : ''}`} data-audience={audience}>
      <div className="polh__inner">
        <h1 className="polh__title">{title}</h1>
        {intro && <p className="polh__sub">{intro}</p>}
      </div>
    </section>
  );
}
