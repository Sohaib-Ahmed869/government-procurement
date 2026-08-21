import { useMemo } from 'react';
import AdvisorDisclaimer from './AdvisorDisclaimer.jsx';
import './AdvisorResult.css';

// A6 — the result.
//
// The engine returns a headline, a ranked set of pathways, the obligations that
// attach whichever pathway is taken, any set-asides, and flags. Everything it
// emits carries `basis` (source keys) and `confidence`, and both are shown:
// the point of a rules-based tool over a guess is that you can see what the
// answer rests on and how firmly.
const CONFIDENCE_LABEL = {
  high: 'Confirmed against the source',
  medium: 'Correct in substance, confirm the figure',
  low: 'Directional only',
  judgement: "The tool's own recommendation, not a rule",
};

// One answer, rendered the way the question asked it. Mirrors the field types
// in features/advisor/fields.js: anything else is printed as given.
function displayValue(question, value) {
  if (question.type === 'bool') return value ? 'Yes' : 'No';
  if (question.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    const shown = n.toLocaleString('en-AU');
    if (question.prefix === '$') return `$${shown}`;
    return question.suffix ? `${shown} ${question.suffix}` : shown;
  }
  const label = (v) => question.options?.find((o) => o.value === v)?.label ?? v;
  if (question.type === 'multi') return (value || []).map(label).join(', ');
  if (question.type === 'select') return label(value);
  return String(value);
}

function isAnswered(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export default function AdvisorResult({ result, rules, answers = {}, onRestart, onExit }) {
  const { headline, pathways = [], obligations = [], setAsides = [], flags = [] } = result;

  // Obligations arrive grouped by the engine; keep that grouping in the order
  // it gave them rather than re-sorting into something it didn't intend.
  const groups = [];
  for (const o of obligations) {
    const name = o.group || 'Other';
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, items: [] }));
    g.items.push(o);
  }

  // Stamped once per result rather than on every render, so the time on the
  // page doesn't drift while it is being read.
  const generated = useMemo(() => {
    const now = new Date();
    return `${now.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })} at ${now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
  }, [result]);

  // The questions that were actually asked and actually answered, in the order
  // the rule pack asks them. `showIf` is re-run against the final answers, so a
  // question that was answered and then hidden by a later change is left out.
  const asked = (rules.questions || []).filter(
    (q) =>
      (typeof q.showIf === 'function' ? Boolean(q.showIf(answers)) : true) &&
      isAnswered(answers[q.id]),
  );

  return (
    <div className="adv-result">
      {/* Screen only. The printed copy is the document; a Print button on it
          would be a button that cannot be pressed. */}
      <div className="adv-result__toolbar" data-print-hide>
        <button
          type="button"
          className="adv-btn adv-btn--ghost adv-btn--print"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Print only: a copy that goes on a procurement file has to say what it
          is, when it was produced and which rule set it was produced against.
          On screen all three are already in the page around it. */}
      <div className="adv-print-head">
        <p className="adv-print-head__brand">Sourcing Advisor</p>
        <p className="adv-print-head__stamp">
          Generated {generated} &middot; {rules.label} &middot; rules as at {rules.asAt}
        </p>
      </div>

      <header className="adv-result__head">
        <p className="adv-result__eyebrow">{rules.label} · rules as at {rules.asAt}</p>
        {headline ? (
          <>
            <h2 className="adv-result__title">{headline.title}</h2>
            <p className="adv-result__statement">{headline.statement}</p>
            <Confidence level={headline.confidence} />
          </>
        ) : (
          <>
            <h2 className="adv-result__title">No single approach is mandated</h2>
            <p className="adv-result__statement">
              On the answers given, the rules do not point to one required pathway. The
              options below are the ones open to you.
            </p>
          </>
        )}
      </header>

      {flags.length > 0 && (
        <section className="adv-result__section" aria-labelledby="adv-flags">
          <h3 className="adv-result__h3" id="adv-flags">Check these first</h3>
          <ul className="adv-flags">
            {flags.map((f, i) => (
              <li className="adv-flag" key={f.id || i}>
                <p className="adv-flag__title">{f.title}</p>
                {f.detail && <p className="adv-flag__detail">{f.detail}</p>}
                <Basis basis={f.basis} rules={rules} confidence={f.confidence} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="adv-result__section" aria-labelledby="adv-pathways">
        <h3 className="adv-result__h3" id="adv-pathways">Pathways</h3>
        <ul className="adv-paths">
          {pathways.map((p) => (
            <li className={`adv-path is-${p.status}`} key={p.id}>
              <div className="adv-path__head">
                <h4 className="adv-path__title">{p.title}</h4>
                <span className={`adv-path__status is-${p.status}`}>{p.statusLabel}</span>
              </div>
              {p.summary && <p className="adv-path__summary">{p.summary}</p>}
              {p.reasons?.length > 0 && (
                <ul className="adv-path__reasons">
                  {p.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
              <Basis basis={p.basis} rules={rules} confidence={p.confidence} />
            </li>
          ))}
        </ul>
      </section>

      {setAsides.length > 0 && (
        <section className="adv-result__section" aria-labelledby="adv-setasides">
          <h3 className="adv-result__h3" id="adv-setasides">Set-asides and policies to apply</h3>
          <ul className="adv-list">
            {setAsides.map((s, i) => (
              <li key={s.id || i}>
                <p className="adv-list__title">{s.title}</p>
                {s.detail && <p className="adv-list__detail">{s.detail}</p>}
                <Basis basis={s.basis} rules={rules} confidence={s.confidence} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.map((g) => (
        <section className="adv-result__section" key={g.name}>
          <h3 className="adv-result__h3">{g.name}</h3>
          <ul className="adv-list">
            {g.items.map((o, i) => (
              <li key={i}>
                <p className="adv-list__title">{o.title}</p>
                {o.detail && <p className="adv-list__detail">{o.detail}</p>}
                <Basis basis={o.basis} rules={rules} confidence={o.confidence} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Print only, and last: the answers the findings above were derived
          from. Without it a printed copy states conclusions with nothing to
          check them against, which is exactly what a file note must not do. */}
      {asked.length > 0 && (
        <section className="adv-print-inputs">
          <h3 className="adv-result__h3">What you told it</h3>
          <dl className="adv-print-inputs__list">
            {asked.map((q) => (
              <div className="adv-print-inputs__row" key={q.id}>
                <dt>{q.label}</dt>
                <dd>{displayValue(q, answers[q.id])}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <AdvisorDisclaimer variant="result" />

      <div className="adv-result__actions" data-print-hide>
        <button type="button" className="adv-btn adv-btn--primary" onClick={onRestart}>
          Start again
        </button>
        <button type="button" className="adv-btn adv-btn--ghost" onClick={onExit}>
          Choose another jurisdiction
        </button>
      </div>
    </div>
  );
}

function Confidence({ level }) {
  if (!level) return null;
  return (
    <p className={`adv-conf is-${level}`}>
      <span className="adv-conf__dot" aria-hidden="true" />
      {CONFIDENCE_LABEL[level] || level}
    </p>
  );
}

// What the finding rests on. Source keys are resolved against the rule pack, so
// a reader can go to the instrument itself rather than taking the tool's word.
function Basis({ basis, rules, confidence }) {
  const keys = Array.isArray(basis) ? basis : [];
  const sources = keys.map((k) => rules.sources?.[k]).filter(Boolean);
  if (!sources.length && !confidence) return null;

  return (
    <div className="adv-basis">
      {confidence && <Confidence level={confidence} />}
      {sources.length > 0 && (
        <ul className="adv-basis__list">
          {sources.map((s, i) => (
            <li key={i}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title}
                </a>
              ) : (
                s.title
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
