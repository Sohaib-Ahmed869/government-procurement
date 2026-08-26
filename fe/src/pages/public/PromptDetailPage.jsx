import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { promptsApi } from '../../api';
import { useAudience } from '../../context/AudienceContext.jsx';
import { useMountReveal } from '../../hooks/useMountReveal.js';
import { TOOL_BY_VALUE, TOPICS } from '../../features/prompts/data.js';
import ToolMark from '../../features/prompts/toolMarks.jsx';
import { unwrapPrompt } from '../../features/prompts/promptText.js';
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
    // The same text that is on screen — see features/prompts/promptText.js.
    const text = unwrapPrompt(prompt?.body);
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
        </div>
      </header>

      <div className="pd__body">
        <div className="pd__inner">
          {/* Topic, use case and the assistant's mark — below the heading strip
              rather than inside it. In the strip they turned a title band into a
              three-line block and made this page's heading sit lower than every
              other page's; here they read as what they are, the prompt's filing
              details, at the top of the prompt itself. */}
          <p className="pd__meta">
            {[topic?.label, prompt.useCase].filter(Boolean).join(' · ')}
            {tool || prompt.tool ? (
              <span
                className={`pl-tool pl-tool--${prompt.tool}`}
                title={tool?.label || prompt.tool}
              >
                <ToolMark tool={prompt.tool} />
                <span className="pl-tool__name">{tool?.label || prompt.tool}</span>
              </span>
            ) : null}
          </p>

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

          {/* Monospace and pre-wrap: a prompt's paragraph breaks, list items
              and placeholder markers are part of it, and a proportional
              paragraph hides all three.

              The text is un-hard-wrapped first, so a paragraph fills the width
              of the box instead of stopping at whatever column it was typed at
              and leaving the right half empty. Structure survives — see
              features/prompts/promptText.js — and the Copy button takes the
              same string, so what is on the clipboard is what is on screen. */}
          <pre className="pd__prompt">{unwrapPrompt(prompt.body)}</pre>

          {/* The "How to use it" note that used to follow the prompt has gone,
              and so has the "Back to the Prompt Library" link under it — the
              back link at the top of the heading strip is the way out, and one
              per page is enough. `notes` is still on the model and still
              editable in the CMS; this page simply no longer prints it. */}
        </div>
      </div>
    </>,
  );
}
