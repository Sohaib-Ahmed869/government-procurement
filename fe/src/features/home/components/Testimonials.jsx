import { useEffect, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { testimonialsApi } from '../../../api';
import './Testimonials.css';

// Client quotes pulled from the CMS. Renders nothing when the list is empty so
// an unpopulated CMS leaves no empty band on the homepage.
export default function Testimonials() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await testimonialsApi.list();
        if (!alive) return;
        setItems(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (status !== 'ready' || items.length === 0) return null;

  return (
    <section ref={ref} className={`ts${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="ts__inner">
        <div className="ts__head">
          <p className="ts__eyebrow">Testimonials</p>
          <h2 className="ts__heading">What our clients say</h2>
        </div>

        <ul className="ts__grid">
          {items.map((t) => {
            const meta = [t.role, t.organisation].filter(Boolean).join(', ');
            return (
              <li key={t._id || `${t.author}-${t.organisation}`} className="ts-card">
                <figure className="ts-card__inner">
                  <span className="ts-card__mark" aria-hidden="true">&ldquo;</span>
                  <blockquote className="ts-card__quote">{t.quote}</blockquote>
                  <figcaption className="ts-card__cite">
                    {t.author && <span className="ts-card__author">{t.author}</span>}
                    {meta && <span className="ts-card__meta">{meta}</span>}
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
