import { useEffect, useRef, useState } from 'react';
import { useInView } from '../../../hooks/useInView.js';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { questionsApi } from '../../../api';
import ForumSidebar from './ForumSidebar.jsx';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import './ForumSubmit.css';

const TOPIC_OPTIONS = [
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
  { value: 'general', label: 'General' },
];

// PLACEHOLDER — the real question titles are still to come. Only the values and
// labels below need swapping; nothing else depends on them.
const TITLE_OPTIONS = [
  { value: 'evaluation', label: 'Evaluation and scoring' },
  { value: 'compliance', label: 'Compliance and conformance' },
  { value: 'probity', label: 'Probity and governance' },
  { value: 'contracts', label: 'Contracts and variations' },
  { value: 'other', label: 'Other' },
];

// A native <select> renders its list with the OS palette and square corners, so
// the pickers are a custom listbox styled to match the rest of the form.
function Select({ id, options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="forum-submit__select-wrap" ref={ref}>
      <button
        type="button"
        id={id}
        className={`forum-submit__input forum-submit__select${current ? '' : ' is-placeholder'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current ? current.label : placeholder}
      </button>

      <span className={`forum-submit__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>

      {open && (
        <ul className="forum-submit__menu" role="listbox" aria-labelledby={id}>
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`forum-submit__option${o.value === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <input type="hidden" name={id.replace('fq-', '')} value={value} />
    </div>
  );
}

export default function ForumSubmit() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState('');
  const [questionTitle, setQuestionTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const formEl = event.target;
    const data = new FormData(formEl);
    const message = (data.get('message') || '').toString().trim();
    const chosen = (data.get('topic') || '').toString();
    const chosenTitle = (data.get('title') || '').toString();
    setSubmitting(true);
    setError('');
    try {
      const titleLabel = TITLE_OPTIONS.find((o) => o.value === chosenTitle)?.label;
      await questionsApi.submit({
        // Use the chosen title; with none picked, derive one from the message.
        title: titleLabel || message.slice(0, 80) || 'Forum question',
        body: message,
        category: ['award', 'general'].includes(chosen) ? chosen : 'win',
        name: (data.get('name') || '').toString().trim(),
        email: (data.get('email') || '').toString().trim(),
      });
      setSent(true);
      setTopic('');
      setQuestionTitle('');
      formEl.reset();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section ref={ref} className={`forum-submit${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="forum-submit__inner">
        <div className="forum-submit__main">
          <h1 className="forum-submit__heading">Submit a Question</h1>

          <form className="forum-submit__form" onSubmit={handleSubmit}>
            <div className="forum-submit__field" style={{ '--i': 0 }}>
              <label className="forum-submit__label" htmlFor="fq-name">
                Name
              </label>
              <input
                id="fq-name"
                name="name"
                type="text"
                className="forum-submit__input"
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="forum-submit__field" style={{ '--i': 1 }}>
              <label className="forum-submit__label" htmlFor="fq-email">
                Email address
              </label>
              <input
                id="fq-email"
                name="email"
                type="email"
                className="forum-submit__input"
                placeholder="Enter your email address"
                required
              />
            </div>

            <div className="forum-submit__field" style={{ '--i': 2 }}>
              <label className="forum-submit__label" htmlFor="fq-title">
                Question title
              </label>
              <Select
                id="fq-title"
                options={TITLE_OPTIONS}
                value={questionTitle}
                onChange={setQuestionTitle}
                placeholder="Select a question title"
              />
            </div>

            <div className="forum-submit__field" style={{ '--i': 3 }}>
              <label className="forum-submit__label" htmlFor="fq-topic">
                Enter topic
              </label>
              <Select
                id="fq-topic"
                options={TOPIC_OPTIONS}
                value={topic}
                onChange={setTopic}
                placeholder="Enter your topic"
              />
            </div>

            <div className="forum-submit__field" style={{ '--i': 4 }}>
              <label className="forum-submit__label" htmlFor="fq-message">
                Message
              </label>
              <textarea
                id="fq-message"
                name="message"
                className="forum-submit__input forum-submit__textarea"
                placeholder="Enter your Message"
                rows={5}
                required
              />
            </div>

            {error && (
              <p className="forum-submit__error" role="alert" style={{ color: '#b03028', margin: '4px 0 0' }}>
                {error}
              </p>
            )}

            <button type="submit" className="forum-submit__send" style={{ '--i': 5 }} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send now'}
              <span className="forum-submit__send-arrow" aria-hidden="true">
                <img src={arrowIcon} alt="" />
              </span>
            </button>

            {sent && (
              <p className="forum-submit__sent" role="status">
                Thanks! Your question has been received. We&rsquo;ll be in touch shortly.
              </p>
            )}
          </form>
        </div>

        <ForumSidebar />
      </div>
    </section>
  );
}
