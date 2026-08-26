import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { promptsApi } from '../../../api';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { useFadeSwap } from '../../../hooks/useFadeSwap.js';
import BackToTop from '../../../components/shared/BackToTop.jsx';
import { TOPICS, TOOLS, TOOL_BY_VALUE } from '../data.js';
import ToolMark from '../toolMarks.jsx';
import { unwrapPrompt, promptTeaser } from '../promptText.js';
import './PromptsBrowser.css';

// B4 — the prompt library, laid out on the Courses page's structure: a filter
// sidebar on desktop that becomes a slide-up panel on phones, and the results
// beside it.
//
// The three levels are visible in the layout and not only in the data (B4.4).
// Filtering narrows what is shown; it never flattens the structure. Whatever
// survives the filters is still printed as Main Topic → Use Case → the prompts
// under it, each tagged with the tool it was written for. Filter to one use
// case and you still see which topic it belongs to.

const ALL = 'all';

function FilterGroup({ heading, name, options, value, onChange }) {
  return (
    <div className="browse-filter">
      <h3 className="browse-filter__heading">{heading}</h3>
      <div className="browse-filter__options">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`browse-radio${value === opt.value ? ' is-active' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span className="browse-radio__dot" aria-hidden="true" />
            <span className="browse-radio__label">
              {/* The assistants carry their mark beside the name here. The name
                  stays: this is a radio, and a row of three unlabelled logos is
                  a guessing game rather than a filter. */}
              {opt.tool && <ToolMark tool={opt.tool} size={15} />}
              {opt.label}
            </span>
            {opt.count !== undefined && <span className="browse-radio__count">{opt.count}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function PromptsBrowser() {
  const { audience } = useAudience();
  const inView = useMountReveal();

  // The filter rail scrolls away with the page, so the results can run well past
  // it. This is what gets a visitor back to the filters without scrolling the
  // whole list by hand.
  const topRef = useRef(null);

  // B4.5 — the filters live in the URL, so a filtered view can be linked,
  // bookmarked and walked back through with the browser's own back button.
  // Kept out of component state entirely rather than mirrored into it: two
  // copies of the same thing is how a filter and its URL drift apart.
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') || ALL;
  const useCase = params.get('use') || ALL;
  const tool = params.get('tool') || ALL;

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    // Replace rather than push: dragging down a radio list would otherwise
    // stack a history entry per option and bury the page the visitor came from.
    //
    // Choosing a filter is a navigation, and ScrollToTop takes every
    // navigation to the top of the page — which is exactly what a filter should
    // do here, heading band included. It used to be suppressed (with
    // keepScrollOnNextNavigation) and replaced by a scroll to the top of the
    // browse section, which parked the rail under the sticky chrome and left
    // the page's own title off screen.
    setParams(next, { replace: true });
  };

  // What the RESULTS are filtered by. Behind the rail by the length of the
  // fade-out, so the list that leaves the screen is the one the visitor was
  // looking at — see hooks/useFadeSwap.js. The rail itself reads the live values
  // above, so a radio answers the click that selected it straight away.
  const [appliedKey, fading] = useFadeSwap(JSON.stringify([topic, useCase, tool]));
  const [shownTopic, shownUseCase, shownTool] = JSON.parse(appliedKey);

  const [prompts, setPrompts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await promptsApi.list();
        if (!alive) return;
        setPrompts(list || []);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Phone: the sidebar becomes a slide-up panel, same as Courses.
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  // Every count is computed against the OTHER two filters rather than the whole
  // set, so a number next to an option is what clicking it actually yields — a
  // count that ignores the current filters promises results it cannot deliver.
  const topicOptions = useMemo(() => {
    const matches = (p) =>
      (useCase === ALL || p.useCase === useCase) && (tool === ALL || p.tool === tool);
    return [
      { value: ALL, label: 'All topics', count: prompts.filter(matches).length },
      ...TOPICS.map((t) => ({
        value: t.value,
        label: t.label,
        count: prompts.filter((p) => p.mainTopic === t.value && matches(p)).length,
      })),
    ];
  }, [prompts, useCase, tool]);

  // The middle level. Unlike the other two rails, this one lists EVERY use case
  // the library holds, whatever is selected above and below it. It used to drop
  // any option with nothing left under the other filters, which made the rail
  // itself move: picking a topic or a tool shortened the use-case list, so the
  // option a visitor was reaching for jumped or vanished under the pointer, and
  // there was no way to see the library's full middle level at all.
  //
  // The counts still answer to the other filters, so a number is what clicking
  // that option actually yields — a zero is the honest answer for a combination
  // that holds nothing, and the results column says so in words.
  //
  // The order is the one the API returned (topic, then useCaseOrder, then
  // name), so the rail lists use cases in the order the results below print
  // them.
  const useCaseOptions = useMemo(() => {
    const matches = (p) =>
      (topic === ALL || p.mainTopic === topic) && (tool === ALL || p.tool === tool);
    const seen = [];
    for (const p of prompts) {
      if (p.useCase && !seen.includes(p.useCase)) seen.push(p.useCase);
    }
    return [
      { value: ALL, label: 'All use cases', count: prompts.filter(matches).length },
      ...seen.map((name) => ({
        value: name,
        label: name,
        count: prompts.filter((p) => p.useCase === name && matches(p)).length,
      })),
    ];
  }, [prompts, topic, tool]);

  const toolOptions = useMemo(() => {
    const matches = (p) =>
      (topic === ALL || p.mainTopic === topic) && (useCase === ALL || p.useCase === useCase);
    return [
      { value: ALL, label: 'All tools', count: prompts.filter(matches).length },
      ...TOOLS.map((t) => ({
        value: t.value,
        label: t.label,
        tool: t.value,
        count: prompts.filter((p) => p.tool === t.value && matches(p)).length,
      })),
    ];
  }, [prompts, topic, useCase]);

  // Filtered, then regrouped into the hierarchy. Grouping after filtering is
  // what keeps the three levels visible no matter how narrow the view gets.
  const groups = useMemo(() => {
    const visible = prompts.filter(
      (p) =>
        (shownTopic === ALL || p.mainTopic === shownTopic) &&
        (shownUseCase === ALL || p.useCase === shownUseCase) &&
        (shownTool === ALL || p.tool === shownTool),
    );

    return TOPICS.map((t) => {
      const mine = visible.filter((p) => p.mainTopic === t.value);
      const cases = [];
      for (const p of mine) {
        let group = cases.find((c) => c.name === p.useCase);
        if (!group) {
          group = { name: p.useCase, order: p.useCaseOrder ?? 0, items: [] };
          cases.push(group);
        }
        // Lowest wins, so one prompt left at the default can't drag a whole
        // use case to the top of its topic.
        group.order = Math.min(group.order, p.useCaseOrder ?? 0);
        group.items.push(p);
      }
      cases.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      return { ...t, cases };
    }).filter((t) => t.cases.length > 0);
  }, [prompts, shownTopic, shownUseCase, shownTool]);

  const total = groups.reduce((n, t) => n + t.cases.reduce((m, c) => m + c.items.length, 0), 0);
  const filtered = topic !== ALL || useCase !== ALL || tool !== ALL;

  return (
    <section ref={topRef} className={`browse pl${inView ? ' is-in' : ''}`} data-audience={audience}>
      {/* Sends you to the filters rather than to the page's hero — on a phone
          that is the "Filter prompts" button, which is the same thing. */}
      <BackToTop targetRef={topRef} label="Back to the filters" />

      <div className="browse__inner">
        {/* Sidebar on desktop; a slide-up panel on phones. */}
        <div id="browse-filter-panel" className={`browse-filters-wrap${filtersOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="browse-filters__close"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
              strokeWidth="2" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>

          <aside className="browse-filters">
            {/* Sidebar order mirrors the hierarchy: topic, then use case, then
                tool. Reading down the filters teaches the structure. */}
            <FilterGroup
              heading="Main topic"
              name="topic"
              options={topicOptions}
              value={topic}
              onChange={(v) => setFilter('topic', v)}
            />
            <FilterGroup
              heading="Use case"
              name="use"
              options={useCaseOptions}
              value={useCase}
              onChange={(v) => setFilter('use', v)}
            />
            <FilterGroup
              heading="AI tool"
              name="tool"
              options={toolOptions}
              value={tool}
              onChange={(v) => setFilter('tool', v)}
            />

            {filtered && (
              <button
                type="button"
                className="browse-filters__reset"
                onClick={() => {
                  setParams(new URLSearchParams(), { replace: true });
                }}
              >
                Reset filters
              </button>
            )}
          </aside>
        </div>

        <div className="browse-main">
          <button
            type="button"
            className="browse-main__filter-button"
            aria-expanded={filtersOpen}
            aria-controls="browse-filter-panel"
            onClick={() => setFiltersOpen(true)}
          >
            Filter prompts
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          {/* Everything that answers the filters, and nothing that sets them:
              the button above opens the phone panel and must not fade out from
              under the thumb that just pressed it. */}
          <div className={`browse-results${fading ? ' is-swapping' : ''}`}>
          {status === 'loading' && <p className="browse-main__note">Loading prompts…</p>}
          {status === 'error' && (
            <p className="browse-main__note">
              We couldn&apos;t load the prompt library right now. Please try again shortly.
            </p>
          )}
          {status === 'ready' && prompts.length === 0 && (
            <p className="browse-main__note">No prompts have been published yet.</p>
          )}
          {status === 'ready' && prompts.length > 0 && total === 0 && (
            <p className="browse-main__note">No prompts match those filters.</p>
          )}

          {groups.map((group) => (
            <section className="browse-group pl-topic" key={group.value}>
              {/* The heading alone. The blurb under it ("Buying: going to
                  market and running the process.") restated the topic it sat
                  under, to a visitor who had just chosen that topic. */}
              <header className="pl-topic__head">
                <h2 className="pl-topic__title">{group.label}</h2>
              </header>

              {group.cases.map((useCaseGroup) => (
                <section className="pl-case" key={useCaseGroup.name}>
                  <h3 className="pl-case__title">{useCaseGroup.name}</h3>

                  <ul className="pl-cards">
                    {useCaseGroup.items.map((prompt) => (
                      <PromptCard key={prompt._id || prompt.id} prompt={prompt} />
                    ))}
                  </ul>
                </section>
              ))}
            </section>
          ))}
          </div>
        </div>
      </div>

    </section>
  );
}

/* Copying a prompt, wherever the button is.

   Lifted out of the card so the card and the dialog cannot drift into two
   behaviours — and because the clipboard fallback below is exactly the sort of
   thing that gets fixed in one copy of it and not the other. */
function useCopyPrompt(prompt) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    // Un-hard-wrapped, so the card's Copy and the detail page's put the same
    // string on the clipboard — see features/prompts/promptText.js.
    const text = unwrapPrompt(prompt?.body);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers and any non-secure origin: fall back to a hidden
      // textarea and the legacy command, so the button is never a dead end.
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

  return { copied, copy };
}

function CopyIcon({ copied }) {
  return copied ? (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

/* B4.6 / B4.7 — one card, one prompt.

   A SUMMARY, not the prompt. Every card used to print its prompt in full, so a
   use case holding a dozen of them was several screens of monospace to scroll
   past before the next heading — you could not see what the library held
   without reading all of it. The card now carries what tells one prompt from
   another (its name, the tool it is written for, its opening line) and the
   prompt itself is one click away.

   Deliberately still NOT a chat mock-up: no assistant avatar, no simulated
   reply. What the library ships is the prompt; what the tool says back is the
   visitor's business. */
function PromptCard({ prompt }) {
  const { copied, copy } = useCopyPrompt(prompt);
  const tool = TOOL_BY_VALUE[prompt.tool];
  const teaser = promptTeaser(prompt);

  return (
    <li className="pl-card">
      {/* The whole card is the link. A real <a>, so it can be opened in a new
          tab, bookmarked and read by anything collecting the page's
          destinations — which a button opening a dialog could not be. Copy sits
          OUTSIDE it: a control inside a link is invalid markup, and taking the
          prompt should not also navigate. */}
      <Link className="pl-card__open" to={`/prompt-library/${prompt._id || prompt.id}`}>
        <span className="pl-card__head">
          <span className="pl-card__title">{prompt.title}</span>
          {/* The assistant's mark, not its name. The name is still the
              accessible one — the mark is decorative to a screen reader and the
              text below it is what gets read — and `title` puts it back for a
              pointer that hovers the pill. */}
          <span
            className={`pl-tool pl-tool--${prompt.tool}`}
            title={tool?.label || prompt.tool}
          >
            <ToolMark tool={prompt.tool} />
            <span className="pl-tool__name">{tool?.label || prompt.tool}</span>
          </span>
        </span>
        {teaser ? <span className="pl-card__teaser">{teaser}</span> : null}
      </Link>

      <div className="pl-card__foot">
        <span className="pl-card__view" aria-hidden="true">View prompt</span>
        <button type="button" className={`pl-copy${copied ? ' is-copied' : ''}`} onClick={copy}>
          <span className="pl-copy__icon" aria-hidden="true"><CopyIcon copied={copied} /></span>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <span className="pl-copy__status" role="status" aria-live="polite">
          {copied ? `${prompt.title} copied to clipboard` : ''}
        </span>
      </div>
    </li>
  );
}

