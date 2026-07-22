import { useEffect, useRef, useState } from 'react';
import { contactApi } from '../../../api';
import arrowIcon from '../../../assets/icons/Arrow outward.png';
import callIcon from '../../../assets/icons/Call.png';
import wave from '../../../assets/images/WaveAdvisoryPage.png';
import phoneWave from '../../../assets/images/ForumPhoneWave.png';
import './ContactSection.css';

const CONTACT_METHODS = [
  { key: 'phone', label: 'Phone', value: '+123 456 789', href: 'tel:+123456789' },
  { key: 'whatsapp', label: 'Whatsapp', value: '+123 456 789', href: 'https://wa.me/123456789' },
  { key: 'email', label: 'Email', value: 'johnsmith@gmail.com', href: 'mailto:johnsmith@gmail.com' },
];

const TOPIC_OPTIONS = [
  { value: 'award', label: 'Award Contracts' },
  { value: 'win', label: 'Win Contracts' },
  { value: 'general', label: 'General' },
];

// Custom listbox rather than a native <select>: the OS-drawn popup can't be
// rounded or recoloured. Mirrors the forum submit form's topic picker.
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
    <div className="contact__select-wrap" ref={ref}>
      <button
        type="button"
        id="contact-topic"
        className={`contact__input contact__select${current ? '' : ' is-placeholder'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current ? current.label : 'Enter your topic'}
      </button>

      <span className={`contact__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>

      {open && (
        <ul className="contact__menu" role="listbox" aria-labelledby="contact-topic">
          {TOPIC_OPTIONS.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`contact__option${o.value === value ? ' is-active' : ''}`}
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

export default function ContactSection() {
  // Mount animation: reveal after the first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const formEl = event.target;
    const data = new FormData(formEl);
    setSubmitting(true);
    setError('');
    try {
      await contactApi.submit({
        name: (data.get('name') || '').toString().trim(),
        email: (data.get('email') || '').toString().trim(),
        message: (data.get('message') || '').toString().trim(),
        subject: (data.get('topic') || '').toString(),
        audience: 'award',
      });
      setSent(true);
      setTopic('');
      formEl.reset();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className={`contact${mounted ? ' is-in' : ''}`}
      data-audience="award"
    >
      {/* Phones get the wave drawn for narrow screens; CSS swaps which shows. */}
      <img className="contact__wave" src={wave} alt="" aria-hidden="true" />
      <img
        className="contact__wave contact__wave--phone"
        src={phoneWave}
        alt=""
        aria-hidden="true"
      />

      <div className="contact__inner">
        <p className="contact__eyebrow">Our Expertise</p>
        <h1 className="contact__title">Let&rsquo;s Work Together</h1>

        <div className="contact__grid">
          {/* --- form --- */}
          <form className="contact__form" onSubmit={handleSubmit} noValidate={false}>
            <div className="contact__field">
              <label className="contact__label" htmlFor="contact-name">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                className="contact__input"
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="contact__field">
              <label className="contact__label" htmlFor="contact-email">
                Email address
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                className="contact__input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="contact__field">
              <label className="contact__label" htmlFor="contact-topic">
                Enter topic
              </label>
              <TopicSelect value={topic} onChange={setTopic} />
            </div>

            <div className="contact__field">
              <label className="contact__label" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                className="contact__input contact__textarea"
                placeholder="Enter your Message"
                rows={5}
                required
              />
            </div>

            {error && (
              <p className="contact__error" role="alert" style={{ color: '#ffd7d2', margin: '4px 0 0' }}>
                {error}
              </p>
            )}

            <button type="submit" className="contact__submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send now'}
              <span className="contact__submit-arrow" aria-hidden="true">
                <img src={arrowIcon} alt="" />
              </span>
            </button>

            {sent && (
              <p className="contact__sent" role="status">
                Thanks! Your message has been received. We&rsquo;ll be in touch shortly.
              </p>
            )}
          </form>

          {/* --- contact details --- */}
          <aside className="contact__details">
            <h2 className="contact__details-heading">Contact Us</h2>
            <ul className="contact__methods">
              {CONTACT_METHODS.map(({ key, label, value, href }) => (
                <li key={key}>
                  <a className="contact__pill" href={href}>
                    <span className="contact__pill-icon" aria-hidden="true">
                      <img src={callIcon} alt="" />
                    </span>
                    <span className="contact__pill-text">
                      <span className="contact__pill-label">{label}</span>
                      {value}
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <h2 className="contact__details-heading contact__details-heading--visit">
              Visit us
            </h2>
            <address className="contact__address">
              25 Restwell St, Regus Flinders Centre,
              <br />
              Bankstown, 2200
            </address>
          </aside>
        </div>
      </div>
    </section>
  );
}
