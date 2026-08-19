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

export default function AdvisorResult({ result, rules, onRestart, onExit }) {
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

  return (
    <div className="adv-result">
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

      <AdvisorDisclaimer variant="result" />

      <div className="adv-result__actions">
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
