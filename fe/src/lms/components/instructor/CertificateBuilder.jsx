import LmsIcon from '../LmsIcon.jsx';
import CertificateDesign, { CERTIFICATE_DEFAULTS } from '../certificates/CertificateDesign.jsx';

const HEX = /^#[0-9a-fA-F]{6}$/;

// The three colours a certificate is made of. Free-form, because an instructor
// may be matching an agency's branding that no palette of ours would contain.
const COLOURS = [
  { key: 'accent', label: 'Accent', hint: 'Border, heading and issuer line', fallback: '#0a3114' },
  { key: 'background', label: 'Background', hint: 'The paper', fallback: '#ffffff' },
  { key: 'textColor', label: 'Text', hint: 'Names, course title and body', fallback: '#1a1a1a' },
];

function luminance(hex) {
  const channel = (v) => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(hex.slice(1, 3)) +
    0.7152 * channel(hex.slice(3, 5)) +
    0.0722 * channel(hex.slice(5, 7))
  );
}

// Contrast between two chosen colours. Once the background is the instructor's
// to pick, "is this readable" stops being obvious: white-on-white is now one
// slip away, and the certificate is a printed document where that can't be
// fixed by zooming in.
function contrast(a, b) {
  if (!HEX.test(a) || !HEX.test(b)) return null;
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The certificate tab of the course builder (L4).
//
// Every field starts from CERTIFICATE_DEFAULTS, so a course nobody customises
// still issues something sensible. The preview beside the form is the SAME
// component that renders the issued certificate, so what is designed here is
// what a learner receives.
export default function CertificateBuilder({ course, previewName, onChange }) {
  const c = { ...CERTIFICATE_DEFAULTS, ...(course.certificate ?? {}) };
  const set = (patch) => onChange({ certificate: { ...c, ...patch } });

  const field = (key, label, hint, props = {}) => (
    <label className="lms-field">
      <span className="lms-field__label">{label}</span>
      <input
        className="lms-input"
        value={c[key] ?? ''}
        onChange={(e) => set({ [key]: e.target.value })}
        {...props}
      />
      {hint ? <span className="lms-field__hint">{hint}</span> : null}
    </label>
  );

  return (
    <div className="lms-certbuild">
      <div className="lms-certbuild__form">
        <label className="lms-pref__label">
          <span className="lms-pref__text">
            <span className="lms-pref__name">Award a certificate</span>
            <span className="lms-pref__hint">
              Issued automatically when a learner finishes every lesson.
            </span>
          </span>
          <input
            type="checkbox"
            className="lms-switch__input lms-sr-only"
            checked={c.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
          <span className="lms-switch" aria-hidden="true">
            <span className="lms-switch__knob" />
          </span>
        </label>

        {c.enabled ? (
          <>
            <section className="lms-card" style={{ marginTop: 16 }}>
              <div className="lms-card__head">
                <h2 className="lms-card__title"><LmsIcon name="text" /> Wording</h2>
              </div>

              {field('heading', 'Heading', 'The line at the top. "Certificate of Attendance" and "Statement of Completion" mean different things.')}
              {field('preamble', 'Above the name')}
              {field('statement', 'Between the name and the course')}

              <label className="lms-field">
                <span className="lms-field__label">
                  Footnote
                  <span className="lms-field__optional"> optional</span>
                </span>
                <textarea
                  className="lms-textarea"
                  rows={2}
                  value={c.footnote}
                  placeholder="An accreditation reference or CPD note, if this course carries one."
                  onChange={(e) => set({ footnote: e.target.value })}
                />
              </label>
            </section>

            <section className="lms-card" style={{ marginTop: 16 }}>
              <div className="lms-card__head">
                <h2 className="lms-card__title"><LmsIcon name="user" /> Signature</h2>
              </div>
              {field('signatoryName', 'Signed by', 'Left blank, the course byline is used.')}
              {field('signatoryRole', 'Their role')}
              {field('issuerName', 'Issued by')}
            </section>

            <section className="lms-card" style={{ marginTop: 16 }}>
              <div className="lms-card__head">
                <h2 className="lms-card__title"><LmsIcon name="grid" /> Appearance</h2>
              </div>

              <div className="lms-field">
                <span className="lms-field__label">Colours</span>
                <div className="lms-colourpicks">
                  {COLOURS.map((col) => (
                    <div className="lms-colourpick" key={col.key}>
                      {/* The native control, which opens the OS colour picker
                          with its wheel, sliders and eyedropper. The whole
                          colour space, not a shortlist. */}
                      <input
                        type="color"
                        className="lms-colourpick__input"
                        value={HEX.test(c[col.key]) ? c[col.key] : col.fallback}
                        onChange={(e) => set({ [col.key]: e.target.value })}
                        aria-label={`${col.label} colour`}
                        title={`Pick the ${col.label.toLowerCase()} colour`}
                      />
                      <span className="lms-colourpick__label">
                        {col.label}
                        <span className="lms-field__hint" style={{ margin: 0 }}>{col.hint}</span>
                      </span>
                      <input
                        className="lms-input lms-colourpick__hex"
                        value={c[col.key] ?? ''}
                        spellCheck="false"
                        placeholder={col.fallback}
                        aria-label={`${col.label} hex value`}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          // Stored as typed, so a half-finished hex doesn't get
                          // rewritten under the cursor. The preview simply
                          // keeps the last valid value until it completes.
                          set({ [col.key]: v.startsWith('#') || v === '' ? v : `#${v}` });
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Once the background is chosen too, "is this readable" stops
                    being obvious. 4.5:1 is the WCAG AA threshold for body text. */}
                {contrast(c.textColor, c.background) < 4.5 ? (
                  <span className="lms-field__hint is-warn">
                    <LmsIcon name="lock" />
                    {' '}
                    The text is hard to read on that background. This is a printed
                    document, so a reader can’t zoom in to fix it.
                  </span>
                ) : contrast(c.accent, c.background) < 3 ? (
                  <span className="lms-field__hint is-warn">
                    <LmsIcon name="lock" />
                    {' '}
                    The accent barely shows against the background. The border and
                    heading will be close to invisible in print.
                  </span>
                ) : (
                  <span className="lms-field__hint">
                    Any colour. Click a swatch to open the picker, or type a hex value.
                  </span>
                )}
              </div>

              <label className="lms-check">
                <input
                  type="checkbox"
                  checked={c.showHours}
                  onChange={(e) => set({ showHours: e.target.checked })}
                />
                <span>Show the hours of learning</span>
              </label>
              <label className="lms-check">
                <input
                  type="checkbox"
                  checked={c.showCredentialId}
                  onChange={(e) => set({ showCredentialId: e.target.checked })}
                />
                <span>Show the credential ID</span>
              </label>
              <p className="lms-field__hint">
                The credential ID is what an employer types into the verification
                page. Hiding it doesn’t stop the certificate being verifiable, it
                just means the learner has to find the number elsewhere.
              </p>
            </section>
          </>
        ) : (
          <p className="lms-detail__note">
            No certificate is issued for this course. Learners still get their
            completion recorded, and existing certificates are unaffected.
          </p>
        )}
      </div>

      <div className="lms-certbuild__preview">
        <p className="lms-field__label">Preview</p>
        {c.enabled ? (
          <>
            <CertificateDesign
              design={c}
              recipientName={previewName || 'Sam Taylor'}
              courseTitle={course.title || 'Untitled course'}
              hours={Math.max(1, Math.round((course.minutes ?? 0) / 60))}
              credentialId="GP-2026-XXXXXXXX"
              issuedAt={new Date().toISOString()}
              issuerName={c.issuerName}
              signatoryName={c.signatoryName || course.instructor?.name}
              signatoryRole={c.signatoryRole || course.instructor?.role}
            />
            <p className="lms-detail__note">
              Sample values. A real certificate carries the learner’s name, the
              hours from your lesson times, and its own credential ID.
            </p>
            <p className="lms-detail__note">
              Changing this affects certificates issued from now on. Ones already
              earned keep the wording they were issued with.
            </p>
          </>
        ) : (
          <p className="lms-empty">Certificates are turned off for this course.</p>
        )}
      </div>
    </div>
  );
}
