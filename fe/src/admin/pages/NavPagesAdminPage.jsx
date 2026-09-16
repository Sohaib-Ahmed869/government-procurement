import { useEffect, useState } from 'react';
import { navPagesApi } from '../../api';

// Which of the site's top-level pages appear in the header and footer nav.
//
// Deliberately not a create/delete table: the set of pages is fixed to what
// Header.jsx's NAV_LINKS actually lists (see be/src/constants/navPages.js,
// the single source of truth both sides read). What can be changed here is
// only whether each one's link is shown — the page itself always stays
// reachable at its own URL, on or off, the same way an unpublished article
// still opens for someone who already has the link.
export default function NavPagesAdminPage() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [pages, setPages] = useState([]);
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setStatus('loading');
    navPagesApi
      .list()
      .then((items) => {
        setPages(items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

  const toggle = async (page) => {
    const nextVisible = !page.visible;
    setSavingKey(page.key);
    setError(null);
    // Optimistic: the switch itself is the feedback, so it flips the instant
    // it's clicked rather than waiting on the round trip.
    setPages((ps) => ps.map((p) => (p.key === page.key ? { ...p, visible: nextVisible } : p)));
    try {
      await navPagesApi.setVisible(page.key, nextVisible);
    } catch (err) {
      // The request is the only thing that actually changed it — roll the
      // switch back if it didn't land.
      setPages((ps) => ps.map((p) => (p.key === page.key ? { ...p, visible: page.visible } : p)));
      setError(err?.message || `Could not update "${page.label}"`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Site navigation</h2>
          <p className="admin-page__subtitle">
            Which of these pages appear in the header and footer menus. Turning one off
            removes it from both menus everywhere on the site; the page itself stays
            reachable at its own address either way.
          </p>
        </div>
      </div>

      {status === 'loading' && <p className="admin-page__subtitle">Loading…</p>}
      {status === 'error' && (
        <div className="admin-alert admin-alert--error">Failed to load the site pages.</div>
      )}

      {status === 'ready' && (
        <div className="admin-card">
          {error && <div className="admin-alert admin-alert--error">{error}</div>}

          {pages.map((page) => (
            <div
              key={page.key}
              className="admin-field"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span className="admin-field__label" style={{ margin: 0 }}>
                {page.label}
              </span>

              <label className="admin-checkgroup__item" style={{ whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={page.visible}
                  disabled={savingKey === page.key}
                  onChange={() => toggle(page)}
                />
                <span>{page.visible ? 'Shown' : 'Hidden'}</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
