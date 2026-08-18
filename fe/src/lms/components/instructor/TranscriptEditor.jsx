import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { formatTime } from '../../utils/transcript.js';

// A timestamp as any tool writes it: "83", "1:23", "1:02:03", "00:00:12.500",
// "00:00:12,500". Returns null on anything unparseable so a typo doesn't
// silently become 0:00 and reorder the transcript.
//
// Fractional seconds are kept rather than dropped. A captioning tool emits
// them, and they are what makes two cues a second apart stay in order.
const STAMP = /^(\d+(?::\d{1,2})*)(?:[.,](\d+))?$/;

function parseStamp(raw) {
  const m = String(raw).trim().match(STAMP);
  if (!m) return null;
  const whole = m[1].split(':').reduce((acc, p) => acc * 60 + Number(p), 0);
  return m[2] ? whole + Number(`0.${m[2]}`) : whole;
}

// A timestamp at the head of a line: "0:12", "00:00:12.500", "[0:12]".
const LEADING = /^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\]?[\s ]+(.*)$/;

// Pulls cues out of pasted text. Accepts "[0:12] words", "0:12 words",
// "00:00:12.500 words" (YouTube exporters) and "00:00:12,500 --> ..."
// (SRT/VTT), because instructors will paste whatever their captioning tool gave
// them rather than retype it. Lines without a timestamp. An exporter's header
// comments, a title, a URL. Are skipped rather than treated as an error.
function parseBulk(text) {
  const cues = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const range = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)[.,]?\d*\s*-->/);
    if (range) {
      // SRT/VTT: the text is on the following line(s).
      const t = parseStamp(range[1]);
      const body = [];
      for (let j = i + 1; j < lines.length && lines[j].trim() && !/-->/.test(lines[j]); j += 1) {
        body.push(lines[j].trim());
        i = j;
      }
      if (t !== null && body.length) cues.push({ t, text: body.join(' ') });
      continue;
    }

    const inline = line.match(LEADING);
    if (inline) {
      const t = parseStamp(inline[1]);
      if (t !== null && inline[2].trim()) cues.push({ t, text: inline[2].trim() });
    }
  }

  return cues.sort((a, b) => a.t - b.t);
}

// Transcript editing for a video lesson (L2). Cues are `{ t, text }`. The same
// shape the player consumes, so what is typed here is what syncs there.
export default function TranscriptEditor({ cues, onChange }) {
  const [bulk, setBulk] = useState('');
  const [pasting, setPasting] = useState(false);
  const [error, setError] = useState('');

  const setCue = (i, patch) => {
    const next = cues.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange(next);
  };

  const addCue = () => {
    const last = cues[cues.length - 1];
    onChange([...cues, { t: last ? last.t + 10 : 0, text: '' }]);
  };

  const removeCue = (i) => onChange(cues.filter((_, idx) => idx !== i));

  // Sorting on demand rather than on every keystroke: re-ordering rows while
  // someone is typing a timestamp moves the field out from under their cursor.
  const sort = () => onChange([...cues].sort((a, b) => a.t - b.t));

  const applyBulk = () => {
    const parsed = parseBulk(bulk);
    if (!parsed.length) {
      setError(
        'No cues found. Each line needs a timestamp at the start, like “0:12 Some words”, ' +
          '“[0:12] Some words”, “00:00:12.500 Some words”, or an SRT/VTT file.',
      );
      return;
    }
    onChange(parsed);
    setBulk('');
    setPasting(false);
    setError('');
  };

  const outOfOrder = cues.some((c, i) => i > 0 && c.t < cues[i - 1].t);

  return (
    <div className="lms-transcript-edit">
      <div className="lms-transcript-edit__head">
        <p className="lms-field__label" style={{ margin: 0 }}>
          Transcript
          <span className="lms-field__optional"> {cues.length} cues</span>
        </p>
        <div className="lms-transcript-edit__tools">
          <button type="button" className="lms-btn lms-btn--sm" onClick={() => setPasting((v) => !v)}>
            <LmsIcon name="doc" />
            Paste / import
          </button>
          {outOfOrder ? (
            <button type="button" className="lms-btn lms-btn--sm lms-btn--mint" onClick={sort}>
              Sort by time
            </button>
          ) : null}
        </div>
      </div>

      {pasting ? (
        <div className="lms-bulk">
          <textarea
            className="lms-textarea"
            rows={6}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={
              'Paste a transcript. Accepts:\n' +
              '0:12 Some words\n' +
              '[0:12] Some words\n' +
              '00:00:12.500 Some words\n' +
              'SRT / VTT with --> ranges'
            }
          />
          {error ? <p className="lms-field__error">{error}</p> : null}
          <div className="lms-bulk__actions">
            <button type="button" className="lms-btn lms-btn--sm" onClick={() => { setPasting(false); setError(''); }}>
              Cancel
            </button>
            <button type="button" className="lms-btn lms-btn--sm lms-btn--primary" onClick={applyBulk} disabled={!bulk.trim()}>
              Replace transcript
            </button>
          </div>
        </div>
      ) : null}

      {cues.length === 0 ? (
        <p className="lms-empty" style={{ padding: '16px 0' }}>
          No transcript yet. Paste one, or add cues by hand.
        </p>
      ) : (
        <ol className="lms-cues">
          {cues.map((c, i) => (
            <li className="lms-cue-row" key={i}>
              <input
                className="lms-input lms-cue-row__time"
                value={formatTime(c.t)}
                aria-label={`Cue ${i + 1} timestamp`}
                onChange={(e) => {
                  const t = parseStamp(e.target.value);
                  if (t !== null) setCue(i, { t });
                }}
              />
              <input
                className="lms-input"
                value={c.text}
                aria-label={`Cue ${i + 1} text`}
                placeholder="What's said at this point…"
                onChange={(e) => setCue(i, { text: e.target.value })}
              />
              <button
                type="button"
                className="lms-btn lms-btn--sm lms-btn--ghost"
                onClick={() => removeCue(i)}
                aria-label={`Remove cue ${i + 1}`}
              >
                <LmsIcon name="plus" className="lms-rotate45" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <button type="button" className="lms-btn lms-btn--sm" onClick={addCue}>
        <LmsIcon name="plus" />
        Add cue
      </button>
    </div>
  );
}
