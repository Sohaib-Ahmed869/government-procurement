import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LmsIcon from '../../components/LmsIcon.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import CourseBuilder from '../../components/instructor/CourseBuilder.jsx';
import CertificateBuilder from '../../components/instructor/CertificateBuilder.jsx';
import ModuleEditor from '../../components/instructor/ModuleEditor.jsx';
import LessonEditor from '../../components/instructor/LessonEditor.jsx';
import { authoringApi } from '../../../api/lms.js';
import { useAutosave } from '../../hooks/useApi.js';
import {
  courseReadiness,
  displayStatus,
  STATUS_LABEL,
  useAuthoredCourse,
} from '../../hooks/useAuthoring.js';

const TABS = [
  { value: 'curriculum', label: 'Curriculum', icon: 'modules' },
  { value: 'details', label: 'Details', icon: 'book' },
  { value: 'certificate', label: 'Certificate', icon: 'award' },
  { value: 'publish', label: 'Publish', icon: 'check' },
];

// The course builder (R1), backed by the API.
export default function CourseBuilderPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { course, modules, status, error, reload, applyLesson } = useAuthoredCourse(courseId);

  const [tab, setTab] = useState('curriculum');
  const [selected, setSelected] = useState(null); // { moduleId, lessonId }
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  // Local overlay so typing stays instant while the PATCH is debounced behind
  // it. Without this every keystroke would wait for a round trip.
  const [draft, setDraft] = useState({});
  const [lessonDraft, setLessonDraft] = useState({});

  const courseSave = useAutosave(
    useCallback((patch) => authoringApi.update(courseId, patch), [courseId]),
  );

  // The saved lesson comes back from the PATCH, so the local copy is brought
  // up to date from the response rather than left stale until the next reload.
  // The draft is then cleared, which matters because the SERVER normalises some
  // fields on write (a pasted YouTube URL becomes an id); holding the typed
  // value over the top would keep showing the URL forever.
  const lessonSave = useAutosave(
    useCallback(
      async (patch) => {
        const lessonId = selected?.lessonId;
        const saved = await authoringApi.updateLesson(courseId, lessonId, patch);
        applyLesson(saved);
        setLessonDraft((d) => {
          // Only the keys this request carried. Anything typed while it was in
          // flight is still unsaved and has to stay in the draft.
          const next = { ...d };
          Object.keys(patch).forEach((k) => {
            if (next[k] === patch[k]) delete next[k];
          });
          return next;
        });
        return saved;
      },
      [courseId, selected?.lessonId, applyLesson],
    ),
  );

  // Switching lesson must flush the previous one's pending edits before the
  // draft is thrown away, or the last few keystrokes are lost.
  const selectLesson = useCallback(
    async (moduleId, lessonId) => {
      await lessonSave.flush();
      setLessonDraft({});
      setSelected({ moduleId, lessonId });
    },
    [lessonSave],
  );

  useEffect(() => {
    if (!selected || !modules.length) return;
    const mod = modules.find((m) => String(m._id) === String(selected.moduleId));
    if (!mod?.lessons.some((l) => String(l._id) === String(selected.lessonId))) setSelected(null);
  }, [modules, selected]);

  // Structural changes (add/remove/reorder) reload, because the server assigns
  // ids and ordering and the client shouldn't guess at them.
  const act = useCallback(
    async (fn) => {
      setBusy(true);
      try {
        const result = await fn();
        await reload();
        return result;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  if (status === 'loading') {
    return (
      <div className="lms-card">
        <span className="lms-skel lms-skel--line" style={{ width: '46%', height: 22 }} />
        <span className="lms-skel lms-skel--bar" style={{ marginTop: 20 }} />
      </div>
    );
  }

  if (status === 'error' || !course) {
    return (
      <div>
        <div className="lms-page__head">
          <div>
            <h1 className="lms-page__title">Course not found</h1>
            <p className="lms-page__subtitle">
              {error ?? 'This course doesn’t exist, or it isn’t yours to edit.'}
            </p>
          </div>
        </div>
        <Link className="lms-btn lms-btn--primary" to="/learn/instructor/courses">
          Back to my courses
        </Link>
      </div>
    );
  }

  const merged = { ...course, ...draft };
  const state = displayStatus(course);

  // The unsaved edit belongs to the LESSON, not to the editor pane.
  //
  // The draft used to be applied only where the fields were, so renaming a
  // lesson left the curriculum rail beside it showing the old name until a
  // reload replaced the server copy. Same for its minutes and kind, and for the
  // counts in the header. Folding the draft into `modules` once means every
  // reader of it sees the same lesson.
  const mergedModules =
    selected && Object.keys(lessonDraft).length
      ? modules.map((m) =>
          String(m._id) !== String(selected.moduleId)
            ? m
            : {
                ...m,
                lessons: m.lessons.map((l) =>
                  String(l._id) === String(selected.lessonId) ? { ...l, ...lessonDraft } : l,
                ),
              },
        )
      : modules;

  const readiness = courseReadiness(merged, mergedModules);

  const activeModule =
    selected && mergedModules.find((m) => String(m._id) === String(selected.moduleId));
  const mergedLesson =
    activeModule?.lessons.find((l) => String(l._id) === String(selected.lessonId)) ?? null;

  const saveState = courseSave.status === 'saving' || lessonSave.status === 'saving'
    ? 'saving'
    : courseSave.status === 'error' || lessonSave.status === 'error'
      ? 'error'
      : 'saved';
  const saveError = courseSave.error || lessonSave.error;

  // Runs both queues now instead of waiting out the debounce. Editing here is
  // continuous, so there is nothing to "submit", but an author who has just
  // typed something important wants to see it land rather than trust that it
  // will. The button is that reassurance, not a different way of saving.
  const saveNow = async () => {
    await Promise.all([courseSave.retry(), lessonSave.retry()]);
  };

  return (
    <div className="lms-builder">
      <div className="lms-builder__bar">
        <div className="lms-builder__id">
          <Link className="lms-backlink" to="/learn/instructor/courses">
            <LmsIcon name="chevron" className="lms-backlink__icon" />
            My courses
          </Link>
          <h1 className="lms-builder__title">{merged.title || 'Untitled course'}</h1>
          <p className="lms-builder__meta">
            {readiness.counts.modules} modules · {readiness.counts.lessons} lessons ·{' '}
            {readiness.counts.minutes} min
          </p>
        </div>

        <div className="lms-builder__actions">
          <span className={`lms-pill lms-status is-${state}`}>{STATUS_LABEL[state]}</span>
          <Link className="lms-btn lms-btn--sm" to={`/learn/courses/${course.slug}`}>
            <LmsIcon name="eye" />
            Preview
          </Link>
          {/* Says what is actually happening rather than always "Saved". */}
          <span className={`lms-builder__saved is-${saveState}`}>
            <LmsIcon name={saveState === 'error' ? 'lock' : 'check'} />
            {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved' : 'Saved'}
          </span>

          {/* Editing is continuous, so this submits nothing new. It exists
              because "it saves as you type" is a claim an author has no reason
              to believe until they have watched it happen once. */}
          <button
            type="button"
            className={`lms-btn lms-btn--sm${saveState === 'error' ? ' lms-btn--danger' : ''}`}
            onClick={saveNow}
            disabled={saveState === 'saving'}
          >
            <LmsIcon name="check" />
            {saveState === 'error' ? 'Retry save' : 'Save now'}
          </button>
        </div>
      </div>

      {/* A failed save has to be loud. Quietly reading "Not saved" in the
          corner while the fields still show the new text is how an author loses
          an afternoon's work without knowing it. */}
      {saveState === 'error' ? (
        <div className="lms-card lms-notice lms-notice--danger lms-builder__savefail">
          <span className="lms-notice__icon"><LmsIcon name="lock" /></span>
          <div className="lms-notice__body">
            <p className="lms-notice__title">Your last change wasn’t saved</p>
            <p className="lms-notice__text">
              {saveError || 'The server refused the change.'}
              {' '}
              It’s still here on screen and will be sent again when you retry, but
              it won’t survive a reload until it saves.
            </p>
          </div>
          <button type="button" className="lms-btn lms-btn--sm lms-btn--primary" onClick={saveNow}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="lms-tabs lms-builder__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`lms-tab${tab === t.value ? ' is-active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            <LmsIcon name={t.icon} />
            {t.label}
            {t.value === 'publish' && readiness.issues.length ? (
              <span className="lms-tab__count">{readiness.issues.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'curriculum' ? (
        <div className={`lms-builder__panes${busy ? ' is-busy' : ''}`}>
          <div className="lms-builder__outline">
            <ModuleEditor
              modules={mergedModules}
              selectedId={selected?.lessonId}
              onSelect={selectLesson}
              onAddModule={() => act(() => authoringApi.addModule(courseId, {}))}
              onRenameModule={(id, title) =>
                act(() => authoringApi.updateModule(courseId, id, { title }))
              }
              onRemoveModule={(id) => {
                const mod = modules.find((m) => String(m._id) === String(id));
                if (!mod?.lessons.length) act(() => authoringApi.removeModule(courseId, id));
                else setConfirming({ kind: 'module', module: mod });
              }}
              onMoveModule={(id, delta) => {
                const ids = modules.map((m) => String(m._id));
                const i = ids.indexOf(String(id));
                const j = i + delta;
                if (j < 0 || j >= ids.length) return;
                [ids[i], ids[j]] = [ids[j], ids[i]];
                act(() => authoringApi.reorderModules(courseId, ids));
              }}
              onAddLesson={async (moduleId, kind) => {
                const lesson = await act(() =>
                  authoringApi.addLesson(courseId, moduleId, { kind }),
                );
                if (lesson?._id) setSelected({ moduleId, lessonId: lesson._id });
              }}
              onMoveLesson={(moduleId, lessonId, delta) => {
                const mod = modules.find((m) => String(m._id) === String(moduleId));
                const ids = mod.lessons.map((l) => String(l._id));
                const i = ids.indexOf(String(lessonId));
                const j = i + delta;
                if (j < 0 || j >= ids.length) return;
                [ids[i], ids[j]] = [ids[j], ids[i]];
                act(() => authoringApi.reorderLessons(courseId, ids));
              }}
            />
          </div>

          <div className="lms-builder__editor">
            {mergedLesson ? (
              <LessonEditor
                lesson={mergedLesson}
                moduleTitle={activeModule.title}
                courseId={courseId}
                onChange={(patch) => {
                  setLessonDraft((d) => ({ ...d, ...patch }));
                  lessonSave.queue(patch);
                }}
                onDelete={() =>
                  setConfirming({ kind: 'lesson', lesson: mergedLesson, moduleId: activeModule._id })
                }
              />
            ) : (
              <div className="lms-blank">
                <LmsIcon name="lessons" className="lms-blank__icon" />
                <h2>Pick a lesson</h2>
                <p>
                  Choose a lesson on the left to edit it, or add a new one. Text, video and
                  quizzes each get their own form.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'details' ? (
        <CourseBuilder
          course={merged}
          modules={mergedModules}
          courseId={courseId}
          onChange={(patch) => {
            setDraft((d) => ({ ...d, ...patch }));
            courseSave.queue(patch);
          }}
          // The cover image is already saved by the time this fires; the copy
          // on screen just has to catch up with it.
          onLocalChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        />
      ) : null}

      {tab === 'certificate' ? (
        <CertificateBuilder
          course={{ ...merged, minutes: readiness.counts.minutes }}
          onChange={(patch) => {
            setDraft((d) => ({ ...d, ...patch }));
            courseSave.queue(patch);
          }}
        />
      ) : null}

      {tab === 'publish' ? (
        <div className="lms-publish">
          {state === 'pending' ? (
            <section className="lms-card lms-notice">
              <span className="lms-notice__icon"><LmsIcon name="clock" /></span>
              <div className="lms-notice__body">
                <p className="lms-notice__title">Submitted for review</p>
                <p className="lms-notice__text">
                  An administrator is checking it over. You can keep editing. Anything you
                  change is part of what they review.
                </p>
              </div>
              <button
                type="button"
                className="lms-btn lms-btn--sm"
                onClick={() => act(() => authoringApi.withdraw(courseId))}
              >
                Withdraw
              </button>
            </section>
          ) : null}

          {state === 'rejected' ? (
            <section className="lms-card lms-notice lms-notice--danger">
              <span className="lms-notice__icon"><LmsIcon name="lock" /></span>
              <div className="lms-notice__body">
                <p className="lms-notice__title">Changes requested</p>
                <p className="lms-notice__text">
                  {course.reviewNote || 'An administrator has asked for changes before this can go live.'}
                </p>
              </div>
            </section>
          ) : null}

          {/* Said differently from "changes requested" on purpose. This wasn't
              a checklist, and reading it as one would send the author back to
              tidy up a course that needs rethinking. */}
          {state === 'declined' ? (
            <section className="lms-card lms-notice lms-notice--danger">
              <span className="lms-notice__icon"><LmsIcon name="lock" /></span>
              <div className="lms-notice__body">
                <p className="lms-notice__title">Not accepted</p>
                <p className="lms-notice__text">
                  {course.reviewNote || 'An administrator decided this course won’t go on the site.'}
                </p>
                <p className="lms-notice__text">
                  This wasn’t a request for corrections. If you rework it to address
                  the reason above, you can submit it again.
                </p>
              </div>
            </section>
          ) : null}

          <section className="lms-card" style={{ marginTop: state === 'draft' ? 0 : 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name={readiness.ready ? 'check' : 'lock'} />
                {readiness.ready ? 'Ready to submit' : 'Before you submit'}
              </h2>
            </div>

            {readiness.issues.length ? (
              <>
                <p className="lms-detail__note" style={{ marginTop: 0 }}>
                  These aren’t blocking, and you can submit anyway, but each one is something
                  a reviewer will send back.
                </p>
                <ul className="lms-issues">
                  {readiness.issues.map((i) => (
                    <li key={i}>
                      <LmsIcon name="lock" />
                      {i}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="lms-detail__note" style={{ marginTop: 0 }}>
                Everything checks out: modules, lessons, transcripts and quizzes are all in
                place.
              </p>
            )}

            <div className="lms-publish__counts">
              {[
                ['Modules', readiness.counts.modules],
                ['Lessons', readiness.counts.lessons],
                ['Videos', readiness.counts.videos],
                ['Transcripts', `${readiness.counts.transcripts}/${readiness.counts.videos}`],
                ['Quizzes', readiness.counts.quizzes],
                ['Total time', `${readiness.counts.minutes} min`],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="lms-publish__value">{value}</span>
                  <span className="lms-publish__label">{label}</span>
                </div>
              ))}
            </div>

            <div className="lms-publish__actions">
              {state === 'published' ? (
                <p className="lms-detail__note" style={{ margin: 0 }}>
                  This course is live. An administrator can take it down from the CMS.
                </p>
              ) : state === 'pending' ? (
                <button type="button" className="lms-btn" disabled>
                  <LmsIcon name="clock" />
                  Awaiting review
                </button>
              ) : (
                <button
                  type="button"
                  className="lms-btn lms-btn--primary"
                  disabled={busy}
                  onClick={async () => {
                    await courseSave.flush();
                    await act(() => authoringApi.submit(courseId));
                    setTab('publish');
                  }}
                >
                  <LmsIcon name="check" />
                  {state === 'rejected' || state === 'declined'
                    ? 'Resubmit for review'
                    : 'Submit for review'}
                </button>
              )}
            </div>

            <p className="lms-detail__note">
              Submitting sends the course to an administrator. They publish it to the
              website once they’ve checked it. It doesn’t go live on submission.
            </p>
          </section>

          <section className="lms-card lms-danger" style={{ marginTop: 18 }}>
            <div className="lms-card__head">
              <h2 className="lms-card__title">
                <LmsIcon name="lock" />
                Danger zone
              </h2>
            </div>
            <div className="lms-danger__row">
              <div>
                <p className="lms-danger__name">Delete this course</p>
                <p className="lms-danger__hint">
                  Removes the course and everything in it. The server refuses if anyone is
                  enrolled. Deleting your copy doesn’t undo something they paid for.
                </p>
              </div>
              <button
                type="button"
                className="lms-btn lms-btn--sm lms-btn--danger"
                onClick={() => setConfirming({ kind: 'course' })}
              >
                Delete course
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirming)}
        onCancel={() => setConfirming(null)}
        title={
          confirming?.kind === 'course'
            ? 'Delete this course?'
            : confirming?.kind === 'module'
              ? 'Delete this module?'
              : 'Delete this lesson?'
        }
        message={
          confirming?.kind === 'course'
            ? `“${course.title}” and everything in it, including ${readiness.counts.modules} modules and ${readiness.counts.lessons} lessons, will be removed.`
            : confirming?.kind === 'module'
              ? `“${confirming.module.title}” contains ${confirming.module.lessons.length} lesson${confirming.module.lessons.length === 1 ? '' : 's'}. They'll be deleted with it.`
              : `“${confirming?.lesson?.title || 'This lesson'}” will be removed, along with its content, video and transcript.`
        }
        detail="This cannot be undone."
        confirmLabel={
          confirming?.kind === 'course'
            ? 'Delete course'
            : confirming?.kind === 'module'
              ? 'Delete module'
              : 'Delete lesson'
        }
        onConfirm={async () => {
          const c = confirming;
          setConfirming(null);
          if (c.kind === 'course') {
            try {
              await authoringApi.remove(courseId);
              navigate('/learn/instructor/courses');
            } catch (err) {
              // The server refuses when learners are enrolled. Say why.
              window.alert(err?.message ?? 'Could not delete this course.');
            }
            return;
          }
          if (c.kind === 'module') await act(() => authoringApi.removeModule(courseId, c.module._id));
          else await act(() => authoringApi.removeLesson(courseId, c.lesson._id));
        }}
      />
    </div>
  );
}
