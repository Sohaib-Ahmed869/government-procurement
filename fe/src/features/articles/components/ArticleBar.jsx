import { useEffect, useRef, useState } from 'react';
import { FaLinkedinIn, FaXTwitter, FaFacebookF, FaEnvelope, FaLink, FaCheck } from 'react-icons/fa6';
import { useChromeHeight } from '../../../hooks/useChromeHeight.js';
import { downloadArticlePdf } from '../pdf.js';
import './ArticleBar.css';

// B1 — the bar that stays with the reader.
//
// Title on the left, three actions on the right, and the reading progress drawn
// along the bottom edge as a single rule. It sits flush under the site chrome
// with no gap, so the two read as one band.
//
// Share opens a menu rather than spraying four networks across the bar; Print
// opens the browser's dialog so the reader gets the paper options; Download
// writes a PDF straight to disk with no dialog at all. Those three behave
// differently on purpose and the labels say which is which.
const SHARE_ICONS = { linkedin: FaLinkedinIn, x: FaXTwitter, facebook: FaFacebookF, email: FaEnvelope };

function shareTargets(url, title) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { key: 'x', label: 'X', href: `https://x.com/intent/tweet?url=${u}&text=${t}` },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'email', label: 'Email', href: `mailto:?subject=${t}&body=${t}%0A%0A${u}` },
  ];
}

// The three marks, drawn rather than imported so they share one weight and grid
// with each other. react-icons is used for the networks inside the share menu,
// where the brand marks have to be the real ones.
const Icons = {
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  print: (
    <>
      <path d="M6 9V3h12v6" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v7H6z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {Icons[name]}
    </svg>
  );
}

export default function ArticleBar({ title, progress, article }) {
  const chrome = useChromeHeight();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const menuRef = useRef(null);

  useEffect(() => setUrl(window.location.href), []);

  // A menu that cannot be dismissed by clicking away from it or pressing Escape
  // is a trap on touch, where there is no way to "click off" a fixed element.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked; the network links still work */
    }
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadArticlePdf(article);
    } finally {
      setBusy(false);
    }
  };

  const pct = Math.round(progress * 100);

  return (
    <div className="article-bar" data-print-hide="" style={{ top: chrome }}>
      <div className="article-bar__inner">
        <p className="article-bar__title" title={title}>
          {title}
        </p>

        <div className="article-bar__actions">
          <div className="article-bar__share" ref={menuRef}>
            <button
              type="button"
              className={`article-bar__action${open ? ' is-open' : ''}`}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="true"
            >
              <Icon name="share" />
              <span>Share</span>
            </button>

            {open && (
              <div className="article-bar__menu" role="menu">
                {shareTargets(url, title).map((s) => {
                  const NetworkIcon = SHARE_ICONS[s.key];
                  return (
                    <a
                      key={s.key}
                      className="article-bar__menu-item"
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      <NetworkIcon aria-hidden="true" />
                      <span>{s.label}</span>
                    </a>
                  );
                })}
                <button
                  type="button"
                  className="article-bar__menu-item"
                  role="menuitem"
                  onClick={copy}
                >
                  {copied ? <FaCheck aria-hidden="true" /> : <FaLink aria-hidden="true" />}
                  <span>{copied ? 'Link copied' : 'Copy link'}</span>
                </button>
              </div>
            )}
          </div>

          <button type="button" className="article-bar__action" onClick={() => window.print()}>
            <Icon name="print" />
            <span>Print</span>
          </button>

          <button
            type="button"
            className="article-bar__action"
            onClick={download}
            disabled={busy}
          >
            <Icon name="download" />
            <span>{busy ? 'Preparing…' : 'Download'}</span>
          </button>
        </div>
      </div>

      {/* The progress rule sits on the bar's own bottom edge, as in the
          reference: one line that fills as you read, not a separate strip. */}
      <div
        className="article-bar__progress"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="article-bar__progress-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  );
}
