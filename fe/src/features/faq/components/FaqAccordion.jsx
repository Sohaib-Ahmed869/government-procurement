import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../../../hooks/useInView.js';
import { faqsApi } from '../../../api';
import './FaqAccordion.css';

// FAQ content comes from the CMS API. Each faq = { question, answer, category,
// order }; only published faqs are returned to anonymous visitors.

function Chevron() {
  return (
    <span className="faq-item__chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}

function FaqRow({ item, open, onToggle }) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const buttonId = `${baseId}-button`;

  return (
    <li className={`faq-item${open ? ' is-open' : ''}`}>
      <h3 className="faq-item__heading">
        <button
          type="button"
          id={buttonId}
          className="faq-item__button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="faq-item__question">{item.question}</span>
          <Chevron />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="faq-item__panel"
      >
        <div className="faq-item__answer">
          <p>{item.answer}</p>
        </div>
      </div>
    </li>
  );
}

export default function FaqAccordion() {
  const { ref, inView } = useInView();
  const [category, setCategory] = useState('all');
  // Single-open accordion: track the id of the one expanded row (null = none).
  const [openId, setOpenId] = useState(null);

  const [faqs, setFaqs] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await faqsApi.list();
        if (!alive) return;
        const sorted = [...(list || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        setFaqs(sorted);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Category pills are derived from the distinct categories in the fetched data.
  const categories = useMemo(() => {
    const seen = [];
    for (const f of faqs) {
      const c = f.category || 'General';
      if (!seen.includes(c)) seen.push(c);
    }
    return ['all', ...seen];
  }, [faqs]);

  const visible = category === 'all' ? faqs : faqs.filter((f) => (f.category || 'General') === category);

  return (
    <section ref={ref} className={`faq${inView ? ' is-in' : ''}`}>
      <div className="faq__inner">
        <header className="faq__header">
          <h1 className="faq__title">Frequently asked questions</h1>
          <p className="faq__subtitle">
            Everything you need to know about finding, preparing, and winning government
            procurement opportunities. Can&rsquo;t find an answer? Reach out — we&rsquo;re happy to help.
          </p>
        </header>

        {categories.length > 1 && (
          <div className="faq__filters" role="group" aria-label="Filter questions by category">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`faq__pill${category === cat ? ' is-active' : ''}`}
                aria-pressed={category === cat}
                onClick={() => setCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}

        {status === 'loading' && <p className="faq__subtitle">Loading questions…</p>}
        {status === 'error' && (
          <p className="faq__subtitle">
            We couldn&rsquo;t load the FAQs right now. Please try again shortly.
          </p>
        )}
        {status === 'ready' && visible.length === 0 && (
          <p className="faq__subtitle">No questions have been published yet.</p>
        )}

        {status === 'ready' && visible.length > 0 && (
          <ul className="faq__list">
            {visible.map((item) => {
              const id = item._id || item.id;
              return (
                <FaqRow
                  key={id}
                  item={item}
                  open={openId === id}
                  onToggle={() => setOpenId((cur) => (cur === id ? null : id))}
                />
              );
            })}
          </ul>
        )}

        <div className="faq__cta">
          <p className="faq__cta-text">Still have questions?</p>
          <Link className="faq__cta-link" to="/contact">
            Contact our team
          </Link>
        </div>
      </div>
    </section>
  );
}
