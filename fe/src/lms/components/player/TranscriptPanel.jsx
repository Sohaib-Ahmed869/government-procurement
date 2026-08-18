import { useEffect, useMemo, useRef, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';
import { activeCueIndex, formatTime } from '../../utils/transcript.js';

// Transcript synced to the video (L2). Two directions:
//   video -> transcript   the active cue highlights and scrolls into view
//   transcript -> video   clicking a cue seeks the player to it
//
// Auto-scroll suspends while the learner is searching or has scrolled away, so
// reading ahead doesn't fight the playhead.
export default function TranscriptPanel({ cues, currentTime, onSeek }) {
  const [query, setQuery] = useState('');
  const [follow, setFollow] = useState(true);
  const listRef = useRef(null);
  const activeRef = useRef(null);

  const active = activeCueIndex(cues, currentTime);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cues.map((c, i) => ({ ...c, i }));
    return cues.map((c, i) => ({ ...c, i })).filter((c) => c.text.toLowerCase().includes(q));
  }, [cues, query]);

  // Keep the active cue in view while following.
  //
  // The list is scrolled directly rather than with scrollIntoView, which also
  // scrolls every ancestor that can scroll — so the whole page crept downward
  // once a line, under a video the learner was watching. This moves the list
  // and nothing else.
  //
  // Centred rather than merely brought into view, because a transcript is read
  // forwards: the useful thing is seeing what is coming, not having the current
  // line pinned to the bottom edge.
  useEffect(() => {
    if (!follow || query.trim()) return;
    const list = listRef.current;
    const el = activeRef.current;
    if (!list || !el) return;

    const listBox = list.getBoundingClientRect();
    const cueBox = el.getBoundingClientRect();
    const offset = cueBox.top - listBox.top - (list.clientHeight / 2 - cueBox.height / 2);
    // A line already sitting near the middle doesn't need moving; without this
    // the list micro-scrolls on every cue change.
    if (Math.abs(offset) < 8) return;

    list.scrollTo({ top: list.scrollTop + offset, behavior: 'smooth' });
  }, [active, follow, query]);

  // Reading ahead should not have to fight the playhead, so scrolling the list
  // by hand stops it following until the button is pressed again.
  //
  // Bound to wheel and touch rather than `scroll`, and that distinction is the
  // whole trick: `scroll` also fires for the scrollIntoView above, so it cannot
  // tell the learner's scrolling from our own and would switch itself off a
  // second after being switched on. Wheel and touchmove only come from a person.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;

    const release = () => setFollow(false);
    list.addEventListener('wheel', release, { passive: true });
    list.addEventListener('touchmove', release, { passive: true });
    return () => {
      list.removeEventListener('wheel', release);
      list.removeEventListener('touchmove', release);
    };
  }, []);

  return (
    <div className="lms-transcript">
      <div className="lms-transcript__head">
        <div className="lms-search lms-search--inline" style={{ width: '100%' }}>
          <LmsIcon name="search" />
          <input
            type="search"
            value={query}
            placeholder="Search transcript…"
            aria-label="Search transcript"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`lms-btn lms-btn--sm${follow ? ' lms-btn--mint' : ''}`}
          onClick={() => setFollow((v) => !v)}
          aria-pressed={follow}
          title={
            follow
              ? 'Following the video. Scroll the transcript to read ahead.'
              : 'Jump back to the line being spoken and follow along'
          }
        >
          <LmsIcon name={follow ? 'check' : 'play'} />
          Auto-scroll
        </button>
      </div>

      <ol className="lms-transcript__list" ref={listRef}>
        {filtered.length === 0 ? (
          <li className="lms-empty">No lines match “{query.trim()}”.</li>
        ) : (
          filtered.map((cue) => {
            const isActive = cue.i === active && !query.trim();
            return (
              <li key={cue.i} ref={isActive ? activeRef : null}>
                <button
                  type="button"
                  className={`lms-cue${isActive ? ' is-active' : ''}`}
                  // Announces the line being spoken, so the highlight isn't
                  // information only a sighted learner gets.
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => onSeek(cue.t)}
                >
                  <span className="lms-cue__time">{formatTime(cue.t)}</span>
                  <span className="lms-cue__text">{cue.text}</span>
                </button>
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}
