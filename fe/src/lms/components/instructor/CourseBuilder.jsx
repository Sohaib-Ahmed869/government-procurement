import LmsIcon from '../LmsIcon.jsx';
import ImageUploader from './ImageUploader.jsx';
import { LEVELS, RESOURCE_TYPES, SEGMENTS } from '../../constants/courseTaxonomy.js';
import { courseDurationLabel } from '../../hooks/useAuthoring.js';
import RichTextEditor from '../../../admin/components/RichTextEditor.jsx';

// Descriptions written before the builder had a rich text editor are stored as
// plain text, and the course page renders the field as HTML - so their line
// breaks collapse and the whole thing arrives as one paragraph, which is what
// this replaced.
//
// Converting on the way INTO the editor, rather than migrating the database,
// means nothing is rewritten until an author opens the description and saves
// it. They see the paragraphs, and their next save is what persists them.
const HAS_MARKUP = /<[a-z][\s\S]*>/i;
const SPLIT_PARAGRAPHS = /\n\s*\n/;
const NEWLINE = /\n/g;

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toEditorHtml(body) {
  const text = String(body ?? '');
  if (!text.trim() || HAS_MARKUP.test(text)) return text;
  return text
    .split(SPLIT_PARAGRAPHS)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(NEWLINE, '<br />')}</p>`)
    .join('');
}

const AVAILABILITY = [
  { value: 'open', label: 'Open for enrolment' },
  { value: 'coming_soon', label: 'Coming soon' },
  { value: 'closed', label: 'Closed' },
];

// A list of short strings. "what you'll learn", "requirements", "includes".
// One row each, because a textarea split on newlines loses the structure the
// course page needs to render them as bullets.
function ListField({ label, hint, items, placeholder, onChange }) {
  return (
    <div className="lms-field">
      <span className="lms-field__label">{label}</span>
      {items.length ? (
        <ul className="lms-listfield">
          {items.map((item, i) => (
            <li key={i}>
              <input
                className="lms-input"
                value={item}
                placeholder={placeholder}
                onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
              />
              <button
                type="button"
                className="lms-btn lms-btn--sm lms-btn--ghost"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                aria-label={`Remove item ${i + 1}`}
              >
                <LmsIcon name="plus" className="lms-rotate45" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="lms-btn lms-btn--sm" onClick={() => onChange([...items, ''])}>
        <LmsIcon name="plus" />
        Add
      </button>
      {hint ? <span className="lms-field__hint">{hint}</span> : null}
    </div>
  );
}

// "Who should take this course?" is title + description per audience, so it
// needs a pair editor rather than the plain list above.
function PairField({ items, onChange }) {
  const set = (i, patch) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  return (
    <div className="lms-field">
      <span className="lms-field__label">Who should take this course?</span>
      {items.length ? (
        <ul className="lms-pairfield">
          {items.map((item, i) => (
            <li key={i}>
              <div className="lms-pairfield__row">
                <input
                  className="lms-input"
                  value={item.title}
                  placeholder="New procurement officers"
                  aria-label={`Audience ${i + 1} title`}
                  onChange={(e) => set(i, { title: e.target.value })}
                />
                <button
                  type="button"
                  className="lms-btn lms-btn--sm lms-btn--ghost"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  aria-label={`Remove audience ${i + 1}`}
                >
                  <LmsIcon name="plus" className="lms-rotate45" />
                </button>
              </div>
              <textarea
                className="lms-textarea"
                rows={2}
                value={item.text}
                placeholder="Anyone running their first approach to market inside a Commonwealth entity."
                aria-label={`Audience ${i + 1} description`}
                onChange={(e) => set(i, { text: e.target.value })}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="lms-btn lms-btn--sm"
        onClick={() => onChange([...items, { title: '', text: '' }])}
      >
        <LmsIcon name="plus" />
        Add audience
      </button>
    </div>
  );
}

/* Course metadata (R1).

   Field-for-field with the CMS course editor, because the plan is for the LMS
   to become the source of truth and the CMS's Courses section to go away. Every
   field the public course page reads is editable here:

     card    image · title · durationLabel · availability · level · segment
     detail  summary · body · sidebarSummary · learnPoints · requirements ·
             whoShouldTake · includes · access · instructor · price · currency

   One field is deliberately absent. The Course model's flat `media` array,
   the old way of attaching videos and PDFs. Is superseded by lessons, which
   carry their own video and transcript. When the site reads from the LMS, its
   materials list should be derived from lessons rather than kept in parallel.
*/
export default function CourseBuilder({
  course,
  modules = [],
  courseId,
  onChange,
  // For the fields that save themselves. The cover image is uploaded to the
  // API the moment it is chosen, so folding it into the debounced course PATCH
  // would only queue a write the server is right to ignore. This updates the
  // on-screen copy without asking for a second save.
  onLocalChange = onChange,
}) {
  const set = (patch) => onChange(patch);

  return (
    <div className="lms-coursedetails">
      {/* --- Basics ---------------------------------------------------- */}
      <section className="lms-card">
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="book" />
            Basics
          </h2>
        </div>

        <label className="lms-field">
          <span className="lms-field__label">Course title</span>
          <input className="lms-input" value={course.title} onChange={(e) => set({ title: e.target.value })} />
        </label>

        <label className="lms-field">
          <span className="lms-field__label">Summary</span>
          <textarea
            className="lms-textarea"
            rows={3}
            value={course.summary}
            placeholder="One or two sentences. This is what people read in the catalogue."
            onChange={(e) => set({ summary: e.target.value })}
          />
        </label>

        <fieldset className="lms-rolepick lms-segpick">
          <legend className="lms-field__label">Category</legend>
          <div className="lms-rolepick__grid">
            {SEGMENTS.map((s) => (
              <label
                key={s.value}
                className={`lms-rolecard lms-segcard${course.segment === s.value ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="segment"
                  value={s.value}
                  checked={course.segment === s.value}
                  onChange={() => set({ segment: s.value })}
                  className="lms-sr-only"
                />
                <span className="lms-rolecard__body">
                  <span className="lms-rolecard__title">{s.label}</span>
                  <span className="lms-rolecard__blurb">{s.hint}</span>
                </span>
                <span className="lms-rolecard__tick" aria-hidden="true">
                  <LmsIcon name="check" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="lms-formgrid">
          <label className="lms-field">
            <span className="lms-field__label">Level</span>
            <select
              className="lms-select"
              value={course.level}
              onChange={(e) => set({ level: e.target.value })}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>

          <div className="lms-field">
            <span className="lms-field__label">Course length</span>
            <p className="lms-derived">
              <LmsIcon name="clock" />
              {courseDurationLabel(modules) || 'No lessons yet'}
            </p>
            <span className="lms-field__hint">
              Added up from your lesson times, so it can't disagree with the course.
            </span>
          </div>

          <label className="lms-field">
            <span className="lms-field__label">Resource type</span>
            <select
              className="lms-select"
              value={course.resourceType}
              onChange={(e) => set({ resourceType: e.target.value })}
            >
              {RESOURCE_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="lms-field">
          <span className="lms-field__label">URL slug</span>
          <input className="lms-input" value={course.slug} disabled />
          <span className="lms-field__hint">
            Fixed once created. Changing it would break links people have already saved.
          </span>
        </label>
      </section>

      {/* --- Cover image ----------------------------------------------- */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="media" />
            Course image
          </h2>
          <span className="lms-card__note">Shown on the card and the page header</span>
        </div>
        <ImageUploader
          courseId={courseId ?? course._id}
          image={course.image}
          onChange={(image) => onLocalChange({ image })}
        />
      </section>

      {/* --- Full description ------------------------------------------ */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="text" />
            Course description
          </h2>
        </div>
        <label className="lms-field">
          <span className="lms-sr-only">Course description</span>
          {/* Inline images are off: uploads go through the staff-only media
              API, so the button would offer every instructor a 403. */}
          <RichTextEditor
            value={toEditorHtml(course.body)}
            onChange={(html) => set({ body: html })}
            allowImages={false}
            placeholder="The long description on the course page. Headings, bullets and bold all work."
          />
          <span className="lms-field__hint">
            Formatting is kept when the course is published. Links and lists are cleaned on
            save, so anything pasted from elsewhere arrives as plain formatting.
          </span>
        </label>
      </section>

      {/* --- What learners get ----------------------------------------- */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="check" />
            What learners get
          </h2>
        </div>

        <ListField
          label="What you'll learn"
          placeholder="Apply the CPRs to a real approach to market"
          hint="Outcomes, not topics. What they'll be able to do afterwards."
          items={course.learnPoints ?? []}
          onChange={(learnPoints) => set({ learnPoints })}
        />

        <ListField
          label="Requirements"
          placeholder="No prior procurement experience needed"
          items={course.requirements ?? []}
          onChange={(requirements) => set({ requirements })}
        />

        <PairField
          items={course.whoShouldTake ?? []}
          onChange={(whoShouldTake) => set({ whoShouldTake })}
        />
      </section>

      {/* --- Purchase box ---------------------------------------------- */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="cart" />
            Purchase box
          </h2>
          <span className="lms-card__note">The “Start learning today” card</span>
        </div>

        <div className="lms-formgrid">
          <label className="lms-field">
            <span className="lms-field__label">Price (AUD, incl. GST)</span>
            <input
              className="lms-input"
              type="number"
              min="0"
              value={course.price}
              onChange={(e) => set({ price: Number(e.target.value) })}
            />
            <span className="lms-field__hint">0 makes it free. GST is added at checkout.</span>
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Currency</span>
            <input
              className="lms-input"
              value={course.currency}
              onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
            />
          </label>
        </div>

        <label className="lms-field">
          <span className="lms-field__label">Sidebar summary</span>
          <textarea
            className="lms-textarea"
            rows={2}
            value={course.sidebarSummary ?? ''}
            placeholder="A short line inside the purchase card."
            onChange={(e) => set({ sidebarSummary: e.target.value })}
          />
        </label>

        <ListField
          label="This includes"
          placeholder="20+ hours of content"
          items={course.includes ?? []}
          onChange={(includes) => set({ includes })}
        />

        <ListField
          label="Access"
          placeholder="Lifetime access on any device"
          items={course.access ?? []}
          onChange={(access) => set({ access })}
        />
      </section>

      {/* --- Instructor ------------------------------------------------- */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="user" />
            Instructor byline
          </h2>
        </div>

        <div className="lms-formgrid">
          <label className="lms-field">
            <span className="lms-field__label">Name</span>
            <input className="lms-input" value={course.instructor?.name ?? ''} disabled />
            <span className="lms-field__hint">Taken from your account.</span>
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Role</span>
            <input
              className="lms-input"
              value={course.instructor?.role ?? ''}
              placeholder="e.g. Principal Advisor"
              onChange={(e) => set({ instructor: { ...(course.instructor ?? {}), role: e.target.value } })}
            />
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Avatar URL</span>
            <input
              className="lms-input"
              value={course.instructor?.avatarUrl ?? ''}
              placeholder="https://…"
              onChange={(e) => set({ instructor: { ...(course.instructor ?? {}), avatarUrl: e.target.value } })}
            />
          </label>
        </div>
      </section>

      {/* --- Availability ----------------------------------------------- */}
      <section className="lms-card" style={{ marginTop: 18 }}>
        <div className="lms-card__head">
          <h2 className="lms-card__title">
            <LmsIcon name="calendar" />
            Availability
          </h2>
          <span className="lms-card__note">Separate from publishing</span>
        </div>

        <div className="lms-formgrid">
          <label className="lms-field">
            <span className="lms-field__label">State</span>
            <select
              className="lms-select"
              value={course.availability ?? 'open'}
              onChange={(e) => set({ availability: e.target.value })}
            >
              {AVAILABILITY.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <span className="lms-field__hint">
              A published course can still be “Coming soon”. It shows in the catalogue but
              can’t be bought yet.
            </span>
          </label>

          <label className="lms-field">
            <span className="lms-field__label">Start date</span>
            <input
              className="lms-input"
              type="date"
              value={(course.startDate ?? '').slice(0, 10)}
              onChange={(e) => set({ startDate: e.target.value })}
            />
            <span className="lms-field__hint">Optional. For cohort-based intakes.</span>
          </label>
        </div>

      </section>
    </div>
  );
}
