import { useState, useRef, useEffect, useMemo } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useInView } from '../../../hooks/useInView.js';
import { videosApi, categoriesApi } from '../../../api';
import './VideosBrowser.css';

// A video is either an uploaded file streamed from S3 (native <video>) or a
// pasted YouTube link (lazy facade → iframe). Entries come from the CMS API.
const PER_PAGE = 6;

function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  if (!s) return '';
  const m = Math.floor(s / 60);
  const r = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${r}`;
}

function Chevron({ open }) {
  return (
    <span className={`videos-pill__chevron${open ? ' is-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </span>
  );
}

// Pill-shaped dropdown used by the category filter (mirrors the insights grid).
function PillDropdown({ label, options, value, onChange }) {
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

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="videos-pill" ref={ref}>
      <button
        type="button"
        className="videos-pill__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label ? `${label} ${current.label}` : current.label}
        <Chevron open={open} />
      </button>

      {open && (
        <ul className="videos-pill__menu" role="listbox">
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`videos-pill__option${o.value === value ? ' is-active' : ''}`}
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
    </div>
  );
}

// YouTube video: show the poster thumbnail with a play button; only inject the
// iframe once the user clicks, so we never ship heavy embeds on first paint.
function YouTubePlayer({ video }) {
  const [playing, setPlaying] = useState(false);
  const id = video.youtube?.videoId;
  const poster = video.thumbnail?.url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  if (playing) {
    return (
      <iframe
        className="videos-card__frame"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
        title={video.title}
        allow="accelerated-download; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      className="videos-card__facade"
      style={{ backgroundImage: `url(${poster})` }}
      aria-label={`Play video: ${video.title}`}
      onClick={() => setPlaying(true)}
    >
      <span className="videos-card__play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="videos-card__badge">YouTube</span>
    </button>
  );
}

// A single card: YouTube facade or native S3 <video>, plus meta.
function VideoCard({ video }) {
  const duration = formatDuration(video.durationSeconds);
  const isYouTube = video.source === 'youtube' && video.youtube?.videoId;
  const src = video.file?.url;

  return (
    <li className="videos-card">
      <article className="videos-card__inner">
        <div className="videos-card__player">
          {isYouTube ? (
            <YouTubePlayer video={video} />
          ) : src ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              className="videos-card__video"
              controls
              preload="none"
              poster={video.thumbnail?.url || undefined}
            >
              <source src={src} type={video.file?.mimeType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="videos-card__missing">Video processing…</div>
          )}
          {duration && <span className="videos-card__duration">{duration}</span>}
        </div>
        <div className="videos-card__body">
          {video.categoryName && <span className="videos-card__category">{video.categoryName}</span>}
          <h3 className="videos-card__title">{video.title}</h3>
          {video.description && <p className="videos-card__desc">{video.description}</p>}
        </div>
      </article>
    </li>
  );
}

export default function VideosBrowser() {
  const { audience } = useAudience();
  const { ref, inView } = useInView({ resetKey: audience });
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const [videos, setVideos] = useState([]);
  const [catOptions, setCatOptions] = useState([{ value: 'all', label: 'All' }]);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cats, list] = await Promise.all([
          categoriesApi.list({ kind: 'video' }).catch(() => []),
          videosApi.list({ limit: 100, sort: '-publishedAt' }),
        ]);
        if (!alive) return;

        const catMap = new Map((cats || []).map((c) => [c._id || c.id, c.name]));
        const withNames = (list || []).map((v) => ({
          ...v,
          categoryName: catMap.get(v.category) || '',
        }));

        setVideos(withNames);
        setCatOptions([
          { value: 'all', label: 'All' },
          ...(cats || []).map((c) => ({ value: c._id || c.id, label: c.name })),
        ]);
        setStatus('ready');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(
    () => (category === 'all' ? videos : videos.filter((v) => v.category === category)),
    [videos, category],
  );

  const pageCount = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PER_PAGE;
  const pageItems = visible.slice(start, start + PER_PAGE);

  const changeCategory = (v) => {
    setCategory(v);
    setPage(1);
  };

  return (
    <section ref={ref} className={`videos${inView ? ' is-in' : ''}`} data-audience={audience}>
      <div className="videos__inner">
        {catOptions.length > 1 && (
          <div className="videos__filters">
            <PillDropdown
              label="Category:"
              options={catOptions}
              value={category}
              onChange={changeCategory}
            />
          </div>
        )}

        {status === 'loading' && <p className="videos__empty">Loading videos…</p>}
        {status === 'error' && (
          <p className="videos__empty">We couldn&apos;t load the video library right now. Please try again shortly.</p>
        )}
        {status === 'ready' && pageItems.length === 0 && (
          <p className="videos__empty">No videos have been published yet.</p>
        )}

        {status === 'ready' && pageItems.length > 0 && (
          <ul className="videos__grid">
            {pageItems.map((video) => (
              <VideoCard key={video._id || video.id} video={video} />
            ))}
          </ul>
        )}

        {pageCount > 1 && (
          <nav className="videos__pagination" aria-label="Video pages">
            <button
              type="button"
              className="videos__page-btn"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`videos__page-num${n === safePage ? ' is-active' : ''}`}
                aria-current={n === safePage ? 'page' : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="videos__page-btn"
              disabled={safePage === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
