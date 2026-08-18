import { useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';

// The same forms the server accepts, mirrored here so a bad link is caught
// while the author is still looking at the field rather than on save.
function parseId(input) {
  const s = String(input ?? '').trim();
  if (!s) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return '';
}

// "1:30" or "90" to seconds, for the start point.
function parseStart(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s);
  const parts = s.split(':');
  if (parts.some((p) => !/^\d+$/.test(p.trim()))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

// A YouTube lesson (L1/L2). The pasted URL is turned into an id immediately and
// only the id is stored, so the player is never handed a watch/shorts/youtu.be
// link to re-parse.
//
// Worth being plain about: a YouTube video is public. None of the signed-URL
// protection that applies to uploaded video applies here, so this is the right
// choice for material that is already published and the wrong one for anything
// meant to be behind the paywall.
export default function YouTubeField({ youtube, onChange }) {
  const [draft, setDraft] = useState(youtube?.videoId ?? '');
  const [error, setError] = useState('');

  const videoId = youtube?.videoId ?? '';
  const start = youtube?.startSeconds ?? 0;

  const commit = (raw) => {
    setDraft(raw);
    if (!raw.trim()) {
      setError('');
      onChange({ ...youtube, videoId: '' });
      return;
    }
    const id = parseId(raw);
    if (!id) {
      setError('That doesn’t look like a YouTube link. Paste the watch, share or embed URL.');
      return;
    }
    setError('');
    onChange({ ...youtube, videoId: id });
  };

  return (
    <div className="lms-yt">
      <label className="lms-field">
        <span className="lms-field__label">YouTube link</span>
        <input
          className="lms-input"
          value={draft}
          placeholder="https://www.youtube.com/watch?v=..."
          onChange={(e) => commit(e.target.value)}
        />
        {error ? <span className="lms-field__error">{error}</span> : null}
        {!error && videoId ? (
          <span className="lms-field__hint">
            Video id <code>{videoId}</code>. Stored as the id, not the URL.
          </span>
        ) : null}
      </label>

      {videoId ? (
        <>
          <div className="lms-formgrid">
            <label className="lms-field">
              <span className="lms-field__label">Start at (optional)</span>
              <input
                className="lms-input"
                defaultValue={start ? String(start) : ''}
                placeholder="0:00"
                onChange={(e) => {
                  const secs = parseStart(e.target.value);
                  if (secs !== null) onChange({ ...youtube, startSeconds: secs });
                }}
              />
              <span className="lms-field__hint">Seconds, or m:ss.</span>
            </label>
          </div>

          <label className="lms-field">
            <span className="lms-field__label">What to watch for (optional)</span>
            <textarea
              className="lms-textarea"
              rows={3}
              value={youtube?.note ?? ''}
              placeholder="The embed carries no context. A line here tells the learner why they're watching it."
              onChange={(e) => onChange({ ...youtube, note: e.target.value })}
            />
          </label>

          <div className="lms-yt__preview">
            <iframe
              title="YouTube preview"
              src={`https://www.youtube-nocookie.com/embed/${videoId}${start ? `?start=${start}` : ''}`}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <p className="lms-detail__note">
            <LmsIcon name="lock" />
            {' '}
            A YouTube video is public. Anyone with the link can watch it without
            enrolling, so use an uploaded video for anything that shouldn’t be.
          </p>
        </>
      ) : null}
    </div>
  );
}
