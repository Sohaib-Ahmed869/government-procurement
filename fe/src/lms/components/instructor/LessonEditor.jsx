import LmsIcon from '../LmsIcon.jsx';
import MediaUploader from './MediaUploader.jsx';
import TranscriptEditor from './TranscriptEditor.jsx';
import QuizBuilder from './QuizBuilder.jsx';
import YouTubeField from './YouTubeField.jsx';
import DocumentField from './DocumentField.jsx';
import ResourcesEditor from './ResourcesEditor.jsx';

const KINDS = [
  { value: 'text', label: 'Text lesson', icon: 'text' },
  { value: 'video', label: 'Video lesson', icon: 'video' },
  { value: 'youtube', label: 'YouTube', icon: 'video' },
  { value: 'doc', label: 'Documentation', icon: 'doc' },
  { value: 'quiz', label: 'Quiz', icon: 'quiz' },
];

// What the minutes field is measuring, which differs by kind. "Duration" on a
// PDF is meaningless; "reading time" on a video is wrong.
const TIME_LABEL = {
  text: 'Reading time',
  video: 'Duration',
  youtube: 'Duration',
  doc: 'Reading time',
  quiz: 'Expected time',
};

// Edits one lesson (R1). Which fields appear depends on the kind. A quiz has
// no video, a video has no body, so the form changes shape rather than showing
// everything and letting the author guess what applies.
export default function LessonEditor({ lesson, moduleTitle, courseId, onChange, onDelete }) {
  const set = (patch) => onChange(patch);

  return (
    <div className="lms-lessonedit">
      <div className="lms-lessonedit__head">
        <div>
          <p className="lms-lessonedit__crumb">{moduleTitle}</p>
          <h2 className="lms-lessonedit__title">{lesson.title || 'Untitled lesson'}</h2>
        </div>
        <button type="button" className="lms-btn lms-btn--sm lms-btn--danger" onClick={onDelete}>
          Delete lesson
        </button>
      </div>

      {/* Kind first. It decides the rest of the form. */}
      <div className="lms-kindpick">
        {KINDS.map((k) => (
          <label key={k.value} className={`lms-kind${lesson.kind === k.value ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name={`kind-${lesson._id}`}
              checked={lesson.kind === k.value}
              onChange={() => set({ kind: k.value })}
              className="lms-sr-only"
            />
            <LmsIcon name={k.icon} />
            <span>{k.label}</span>
          </label>
        ))}
      </div>

      <div className="lms-formgrid">
        <label className="lms-field">
          <span className="lms-field__label">Lesson title</span>
          <input
            className="lms-input"
            value={lesson.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </label>

        <label className="lms-field">
          <span className="lms-field__label">
            {TIME_LABEL[lesson.kind] ?? 'Duration'} (minutes)
          </span>
          <input
            className="lms-input"
            type="number"
            min="1"
            value={lesson.minutes}
            onChange={(e) => set({ minutes: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Free preview (L1). Only meaningful on content, not on an assessment. */}
      {lesson.kind !== 'quiz' ? (
        <label className="lms-pref__label lms-lessonedit__preview">
          <span className="lms-pref__text">
            <span className="lms-pref__name">Free preview</span>
            <span className="lms-pref__hint">
              Anyone can open this lesson before buying the course.
            </span>
          </span>
          <input
            type="checkbox"
            className="lms-switch__input lms-sr-only"
            checked={lesson.preview}
            onChange={(e) => set({ preview: e.target.checked })}
          />
          <span className="lms-switch" aria-hidden="true">
            <span className="lms-switch__knob" />
          </span>
        </label>
      ) : null}

      {lesson.kind === 'text' ? (
        <label className="lms-field">
          <span className="lms-field__label">Lesson content</span>
          <textarea
            className="lms-textarea"
            rows={14}
            value={lesson.body}
            placeholder="Write the lesson. Blank lines separate paragraphs."
            onChange={(e) => set({ body: e.target.value })}
          />
          <span className="lms-field__hint">
            Plain text for now. It renders as paragraphs. Rich formatting comes with the
            content API.
          </span>
        </label>
      ) : null}

      {lesson.kind === 'video' ? (
        <>
          <div className="lms-field">
            <span className="lms-field__label">Video</span>
            <MediaUploader
              courseId={courseId}
              lessonId={lesson._id}
              video={lesson.video}
              onChange={(video) => set({ video })}
            />
          </div>

          {lesson.video?.key ? (
            <TranscriptEditor
              cues={lesson.transcript ?? []}
              onChange={(transcript) => set({ transcript })}
            />
          ) : (
            <p className="lms-detail__note">
              Add the video first. The transcript is timed against it.
            </p>
          )}
        </>
      ) : null}

      {lesson.kind === 'youtube' ? (
        <>
          <YouTubeField
            youtube={lesson.youtube ?? { videoId: '', startSeconds: 0, note: '' }}
            onChange={(youtube) => set({ youtube })}
          />

          {/* A transcript is worth as much on an embed as on an uploaded video,
              and the player shows one either way: it is what makes the lesson
              searchable, readable without sound, and usable by someone who
              can't watch it. The cue times are against the YouTube clock. */}
          {lesson.youtube?.videoId ? (
            <TranscriptEditor
              cues={lesson.transcript ?? []}
              onChange={(transcript) => set({ transcript })}
            />
          ) : (
            <p className="lms-detail__note">
              Add the video first. The transcript is timed against it.
            </p>
          )}
        </>
      ) : null}

      {lesson.kind === 'doc' ? (
        <DocumentField
          courseId={courseId}
          document={lesson.document ?? {}}
          onChange={(document) => set({ document })}
        />
      ) : null}

      {lesson.kind === 'quiz' ? (
        <QuizBuilder
          quiz={lesson.quiz ?? { passMark: 70, timeLimitMins: 10, questions: [] }}
          onChange={(quiz) => set({ quiz })}
        />
      ) : null}

      {/* Downloads, on every kind of lesson except a quiz. The player has
          always had a Resources tab; until now there was nowhere to fill it. */}
      {lesson.kind !== 'quiz' ? (
        <ResourcesEditor
          courseId={courseId}
          resources={lesson.resources ?? []}
          onChange={(resources) => set({ resources })}
        />
      ) : null}
    </div>
  );
}
