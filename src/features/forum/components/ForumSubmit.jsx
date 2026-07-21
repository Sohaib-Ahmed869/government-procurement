import { useEffect, useRef, useState } from 'react';
import { useInView } from '../../../hooks/useInView.js';
import ForumSidebar from './ForumSidebar.jsx';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import './ForumSubmit.css';

const TOPIC_OPTIONS = [
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
  { value: 'general', label: 'General' },
];

// A native <select> renders its list with the OS palette and square corners, so
// the topic picker is a custom listbox styled to match the rest of the form.
function TopicSelect({ value, onChange }) {
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

  const current = TOPIC_OPTIONS.find((o) => o.value === value);

  return (
    <div className="forum-submit__select-wrap" ref={ref}>
      <button
        type="button"
        id="fq-topic"
        className={`forum-submit__input forum-submit__select${current ? '' : ' is-placeholder'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current ? current.label : 'Enter your topic'}
      </button>

      <span className={`forum-submit__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>

      {open && (
        <ul className="forum-submit__menu" role="listbox" aria-labelledby="fq-topic">
          {TOPIC_OPTIONS.map((o) => (
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

      <input type="hidden" name="topic" value={value} />
    </div>
  );
}

export default function ForumSubmit() {
  const { ref, inView } = useInView();
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    // Backend forum endpoint isn't wired yet — confirm locally for now.
    setSent(true);
    setTopic('');
    event.target.reset();
  }

  return (
    <section ref={ref} className={`forum-submit${inView ? ' is-in' : ''}`}>
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
              <label className="forum-submit__label" htmlFor="fq-topic">
                Enter topic
              </label>
              <TopicSelect value={topic} onChange={setTopic} />
            </div>

            <div className="forum-submit__field" style={{ '--i': 3 }}>
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

            <button type="submit" className="forum-submit__send" style={{ '--i': 4 }}>
              Send now
              <span className="forum-submit__send-arrow" aria-hidden="true">
                <img src={arrowIcon} alt="" />
              </span>
            </button>

            {sent && (
              <p className="forum-submit__sent" role="status">
                Thanks — your question has been received. We&rsquo;ll be in touch shortly.
              </p>
            )}
          </form>
        </div>

        <ForumSidebar />
      </div>
    </section>
  );
}
