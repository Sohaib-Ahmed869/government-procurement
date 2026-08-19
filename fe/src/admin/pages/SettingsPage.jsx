import { useEffect, useState } from 'react';
import { settingsApi } from '../../api';
import FormField from '../components/FormField.jsx';

// Default shape so controlled inputs never receive undefined before load.
const BLANK = {
  seo: {
    siteName: '',
    defaultTitle: '',
    titleTemplate: '',
    defaultDescription: '',
    defaultOgImage: '',
  },
  contact: { email: '', phone: '', address: '' },
  analytics: { gtmId: '', ga4Id: '' },
};

// Merge a loaded settings document over the blank shape so every field exists.
function normalize(data) {
  return {
    seo: { ...BLANK.seo, ...(data?.seo || {}) },
    contact: { ...BLANK.contact, ...(data?.contact || {}) },
    analytics: { ...BLANK.analytics, ...(data?.analytics || {}) },
  };
}

// Global site settings: SEO, contact details, and analytics IDs.
export default function SettingsPage() {
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    settingsApi
      .get()
      .then((data) => {
        setForm(normalize(data));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load settings');
        setLoading(false);
      });
  }, []);

  // Build a change handler for a given section (seo | contact | analytics).
  const onSectionChange = (section) => (e) => {
    const { name, value } = e.target;
    setSaved(false);
    setForm((f) => ({ ...f, [section]: { ...f[section], [name]: value } }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await settingsApi.update({
        seo: form.seo,
        contact: form.contact,
        analytics: form.analytics,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="admin-tablestate">Loading settings…</p>;

  return (
    <div>
      <div className="admin-page__head">
        <div className="admin-page__heading">
          <h2 className="admin-page__title">Settings</h2>
          <p className="admin-page__subtitle">Global configuration for SEO, contact details and analytics.</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}
      {saved && <div className="admin-alert admin-alert--success">Settings saved.</div>}

      <form onSubmit={onSubmit}>
        <div className="admin-card">
          <div className="admin-card__head">
            <div>
              <h3 className="admin-card__title">SEO</h3>
              <p className="admin-card__desc">Defaults used for page titles, descriptions and social sharing.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <FormField
              label="Site name"
              name="siteName"
              value={form.seo.siteName}
              onChange={onSectionChange('seo')}
            />
            <FormField
              label="Default title"
              name="defaultTitle"
              value={form.seo.defaultTitle}
              onChange={onSectionChange('seo')}
            />
            <FormField
              label="Title template"
              name="titleTemplate"
              hint="e.g. %s | Site name"
              value={form.seo.titleTemplate}
              onChange={onSectionChange('seo')}
            />
            <FormField
              label="Default OG image"
              name="defaultOgImage"
              value={form.seo.defaultOgImage}
              onChange={onSectionChange('seo')}
            />
          </div>
          <FormField
            label="Default description"
            name="defaultDescription"
            as="textarea"
            rows={3}
            value={form.seo.defaultDescription}
            onChange={onSectionChange('seo')}
          />
        </div>

        <div className="admin-card">
          <div className="admin-card__head">
            <div>
              <h3 className="admin-card__title">Contact</h3>
              <p className="admin-card__desc">Shown in the site footer and on the contact page.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <FormField
              label="Email"
              name="email"
              type="email"
              value={form.contact.email}
              onChange={onSectionChange('contact')}
            />
            <FormField
              label="Phone"
              name="phone"
              value={form.contact.phone}
              onChange={onSectionChange('contact')}
            />
          </div>
          <FormField
            label="Address"
            name="address"
            as="textarea"
            rows={2}
            value={form.contact.address}
            onChange={onSectionChange('contact')}
          />
        </div>

        <div className="admin-card">
          <div className="admin-card__head">
            <div>
              <h3 className="admin-card__title">Analytics</h3>
              <p className="admin-card__desc">Tracking IDs injected into the public site.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <FormField
              label="Google Tag Manager ID"
              name="gtmId"
              hint="GTM-XXXXXX"
              value={form.analytics.gtmId}
              onChange={onSectionChange('analytics')}
            />
            <FormField
              label="GA4 measurement ID"
              name="ga4Id"
              hint="G-XXXXXXXXXX"
              value={form.analytics.ga4Id}
              onChange={onSectionChange('analytics')}
            />
          </div>
        </div>

        <div className="admin-savebar">
          <span className="admin-savebar__hint">Changes apply across the public site.</span>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
