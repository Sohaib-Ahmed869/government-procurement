import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { promptsApi } from '../../api';
import { useAudience } from '../../context/AudienceContext.jsx';
import { useMountReveal } from '../../hooks/useMountReveal.js';
import { TOOL_BY_VALUE, TOPICS } from '../../features/prompts/data.js';
import './PromptDetailPage.css';
import Arrow from '../../components/shared/Arrow.jsx';

/* ---------------------------------------------------------------------------
   B4 — one prompt, on a page of its own.

   This was a dialog over the library. A dialog is right for a glance-and-close
   errand, and wrong for this one: a prompt is a document somebody reads, copies,
   sends to a colleague and comes back to. It wants an address. On a page it can
   be linked, opened in a new tab, bookmarked and found again — none of which a
   modal offers — and it reads the same way a course does one level down from
   its catalogue.
   ------------------------------------------------------------------------ */

function CopyIcon({ copied }) {
  return copied ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export default function PromptDetailPage() {
  const { id } = useParams();
  const { audience } = useAudience();
  const mounted = useMountReveal();

  const [prompt, setPrompt] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error

  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const data = await promptsApi.get(id);
        if (!alive) return;
        if (data?._id || data?.id) {
          setPrompt(data);
          setStatus('ready');
        } else {
          setStatus('notfound');
        }
      } catch (err) {
        if (!alive) return;
        setStatus(err?.status === 404 || err?.statusCode === 404 ? 'notfound' : 'error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const copy = useCallback(async () => {
    const text = prompt?.body || '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers and any non-secure origin: the legacy path, so the
      // button is never a dead end.
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
      } catch {
        /* nothing left to try — the prompt is on screen to select by hand */
      }
      document.body.removeChild(el);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  const shell = (children) => (
    <div className="page-scale">
      <PageLayout>
        <div className="pd" data-audience={audience}>
          {children}
        </div>
      </PageLayout>
    </div>
  );

  if (status === 'loading') {
    return shell(
      <div className="pd__inner">
        <p className="pd__state">Loading…</p>
      </div>,
    );
  }

  if (status !== 'ready') {
    return shell(
      <div className="pd__inner">
        <h1 className="pd__title">
          {status === 'notfound' ? 'Prompt not found' : 'Couldn’t load this prompt'}
        </h1>
        <p className="pd__state">
          {status === 'notfound'
            ? 'That prompt isn’t in the library, or it isn’t published yet.'
            : 'Something went wrong at our end. Please try again shortly.'}
        </p>
        <Link className="pd__back" to="/prompt-library">
          <Arrow direction="left" /> Back to the Prompt Library
        </Link>
      </div>,
    );
  }

  const tool = TOOL_BY_VALUE[prompt.tool];
  const topic = TOPICS.find((t) => t.value === prompt.mainTopic);

  return shell(
    <>
      <header className={`pd__head${mounted ? ' is-in' : ''}`}>
        <div className="pd__inner">
          <Link className="pd__back hm-reveal" to="/prompt-library">
            <Arrow direction="left" /> Prompt Library
          </Link>
          <h1 className="pd__title hm-reveal" data-delay="1">{prompt.title}</h1>
          <p className="pd__meta hm-reveal" data-delay="1">
            {[topic?.label, prompt.useCase].filter(Boolean).join(' · ')}
            {tool || prompt.tool ? (
              <span className={`pl-tool pl-tool--${prompt.tool}`}>
                {tool?.label || prompt.tool}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      <div className="pd__body">
        <div className="pd__inner">
          <div className="pd__bar">
            <h2 className="pd__label">The prompt</h2>
            <button type="button" className={`pd__copy${copied ? ' is-copied' : ''}`} onClick={copy}>
              <CopyIcon copied={copied} />
              {copied ? 'Copied' : 'Copy prompt'}
            </button>
            <span className="pd__status" role="status" aria-live="polite">
              {copied ? `${prompt.title} copied to clipboard` : ''}
            </span>
          </div>

          {/* Monospace and pre-wrap: a prompt's line breaks and placeholder
              markers are part of it, and a proportional paragraph hides both —
              what is copied would stop matching what is shown. */}
          <pre className="pd__prompt">{prompt.body}</pre>

          {prompt.notes ? (
            <>
              <h2 className="pd__label pd__label--notes">How to use it</h2>
              <p className="pd__notes">{prompt.notes}</p>
            </>
          ) : null}

          <Link className="pd__more" to="/prompt-library">
            <Arrow direction="left" /> Back to the Prompt Library
          </Link>
        </div>
      </div>
    </>,
  );
}
