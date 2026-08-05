import { useEffect, useState } from 'react';
import { linksApi } from '../../api';
import { EDITABLE_FOOTER_LINKS } from '../../constants/footerLinks.js';

// The footer's social and messaging links.
//
// Deliberately not a create/delete table: every link is drawn with its own brand
// icon in code, so a platform an editor invented would have nothing to show. The
// rows below are therefore fixed — what can be changed is where each one points,
// and whether it appears at all.
//
// WeChat is absent because it has no URL: it opens a dialog with the account's
// QR code rather than navigating anywhere.
export default function LinksManagerPage() {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  // Keyed by platform: { id, url, active } — id is null until first saved.
  const [rows, setRows] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setStatus('loading');
    linksApi
      .list({ group: 'social', all: 1 })
      .then((items) => {
        const saved = new Map(
          (items || []).filter((l) => l.platform).map((l) => [l.platform, l]),
        );
        const next = {};
        for (const link of EDITABLE_FOOTER_LINKS) {
          const match = saved.get(link.platform);
          next[link.platform] = {
            id: match?._id || match?.id || null,
            // Nothing saved yet — show the address the site currently uses, so
            // the first save records what is already live rather than a blank.
            url: match?.url ?? link.href,
            active: match ? match.active !== false : true,
          };
        }
        setRows(next);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

  const setField = (platform, field, value) => {
    setSavedKey(null);
    setRows((r) => ({ ...r, [platform]: { ...r[platform], [field]: value } }));
  };

  const save = async (link) => {
    const row = rows[link.platform];
    if (!row) return;
    if (!row.url.trim()) {
      setError(`${link.label} needs a URL. To hide it, untick "Shown" instead.`);
      return;
    }
    setSavingKey(link.platform);
    setError(null);
    try {
      const body = {
        group: 'social',
        platform: link.platform,
        label: link.label,
        url: row.url.trim(),
        active: row.active,
      };
      if (row.id) await linksApi.update(row.id, body);
      else await linksApi.create(body);
      setSavedKey(link.platform);
      load();
    } catch (err) {
      setError(err?.message || `Failed to save ${link.label}`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Links</h2>
          <p className="admin-page__subtitle">
            Where the footer&rsquo;s social and messaging icons point. Each one keeps its own
            icon, so the list is fixed — change the address, or untick to hide it.
          </p>
        </div>
      </div>

      {status === 'loading' && <p className="admin-page__subtitle">Loading…</p>}
      {status === 'error' && (
        <div className="admin-alert admin-alert--error">Failed to load the links.</div>
      )}

      {status === 'ready' && (
        <div className="admin-card">
          {error && <div className="admin-alert admin-alert--error">{error}</div>}

          {EDITABLE_FOOTER_LINKS.map((link) => {
            const row = rows[link.platform] || { url: '', active: true };
            const Icon = link.Icon;
            return (
              <div
                key={link.platform}
                className="admin-field"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '190px minmax(0, 1fr) auto auto',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  className="admin-field__label"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, margin: 0 }}
                >
                  <Icon aria-hidden="true" style={{ width: 18, height: 18, flex: 'none' }} />
                  {link.label}
                </span>

                <input
                  className="admin-input"
                  type="url"
                  value={row.url}
                  aria-label={`${link.label} URL`}
                  onChange={(e) => setField(link.platform, 'url', e.target.value)}
                />

                <label className="admin-checkgroup__item" style={{ whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={row.active}
                    onChange={(e) => setField(link.platform, 'active', e.target.checked)}
                  />
                  <span>Shown</span>
                </label>

                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--primary"
                  onClick={() => save(link)}
                  disabled={savingKey === link.platform}
                >
                  {savingKey === link.platform
                    ? 'Saving…'
                    : savedKey === link.platform
                      ? 'Saved'
                      : 'Save'}
                </button>
              </div>
            );
          })}

          <p className="admin-field__hint" style={{ marginLeft: 0 }}>
            WeChat isn&rsquo;t listed: it opens a QR code to scan rather than a link. To change
            it, replace the image in the site&rsquo;s assets.
          </p>
        </div>
      )}
    </div>
  );
}
