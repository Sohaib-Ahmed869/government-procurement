import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LmsIcon from './LmsIcon.jsx';
import { useNotifications } from '../hooks/useNotifications.js';

// Recent items read better as an interval than a date: "2h ago" tells you
// whether it happened while you were away, which "18 Aug" does not. Older
// items fall back to the same en-AU date the rest of the LMS prints.
function when(iso) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// The header bell and its panel (R2).
//
// The count is unread items, not total: a bell showing a number you have
// already looked at trains people to ignore it.
export default function NotificationsMenu() {
  const { items, unread, status, enabled, reload, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const close = useCallback(() => setOpen(false), []);

  // Opening is the moment the data is most likely to be stale, so it refetches
  // rather than showing whatever the last poll left behind.
  const toggle = () => {
    setOpen((was) => {
      if (!was) reload();
      return !was;
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // Following a notification is what marks it read. Anything else means the
  // count keeps accusing you of ignoring something you have already dealt with.
  const follow = (item) => {
    markRead(item.id);
    close();
    navigate(item.to);
  };

  return (
    <div className="lms-notif" ref={wrapRef}>
      <button
        type="button"
        className="lms-header__iconbtn"
        title="Notifications"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 ? (
          <span className="lms-header__dot">{unread > 99 ? '99+' : unread}</span>
        ) : null}
      </button>

      {open ? (
        <div className="lms-notif__panel" role="dialog" aria-label="Notifications">
          <div className="lms-notif__head">
            <strong>Notifications</strong>
            {unread > 0 ? (
              <button type="button" className="lms-notif__mark" onClick={markAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>

          {!enabled ? (
            <p className="lms-notif__empty">
              In-app notifications are switched off.{' '}
              <Link to="/learn/settings" onClick={close}>Turn them on in settings</Link>.
            </p>
          ) : status === 'loading' ? (
            <p className="lms-notif__empty">Loading…</p>
          ) : status === 'error' ? (
            <p className="lms-notif__empty">Couldn’t load your notifications.</p>
          ) : !items.length ? (
            <p className="lms-notif__empty">
              Nothing new. Replies to your questions and reminders about courses you have
              started will show up here.
            </p>
          ) : (
            <ul className="lms-notif__list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`lms-notif__item${item.read ? '' : ' is-unread'}`}
                    onClick={() => follow(item)}
                  >
                    <span className={`lms-notif__icon is-${item.kind}`}>
                      <LmsIcon name={item.icon} />
                    </span>
                    <span className="lms-notif__body">
                      <span className="lms-notif__title">{item.title}</span>
                      {item.detail ? (
                        <span className="lms-notif__detail">{item.detail}</span>
                      ) : null}
                      <span className="lms-notif__meta">
                        {item.context ? `${item.context} · ` : ''}
                        {when(item.at)}
                      </span>
                    </span>
                    {!item.read ? <span className="lms-notif__unread" aria-label="Unread" /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="lms-notif__foot">
            <Link to="/learn/settings" onClick={close}>Notification settings</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
