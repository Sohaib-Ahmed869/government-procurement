import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { catalogApi, progressApi } from '../../api/lms.js';
import { textToBlocks } from '../utils/textBlocks.js';

// Everything a lesson screen needs: the lesson itself, its module, where it sits
// in the course, prev/next, and the learner's completion state.
//
// Two requests, because they answer different questions. The outline knows the
// course's shape, which lesson comes next, and whether it is gated, and the
// lesson endpoint returns the content, which the outline deliberately omits.
//
// The gate is NOT re-decided here. GET /lms/courses/:slug/lessons/:id refuses a
// locked lesson with 403 and the reason attached; this surfaces that reason. A
// client-side check would only be a second opinion that can disagree with the
// one that actually guards the content.
function flatten(modules) {
  return modules.flatMap((m, mi) =>
    (m.lessons ?? []).map((l) => ({
      ...l,
      id: l._id,
      module: { ...m, id: m._id, order: mi + 1 },
    })),
  );
}

// The server sends the gate as a JSON string in the error message, because that
// is what ApiError carries. Anything unparseable still means locked.
function gateFromError(err) {
  try {
    const parsed = JSON.parse(err?.message ?? '');
    if (parsed?.reason) return parsed;
  } catch {
    /* fall through */
  }
  return { reason: 'locked-enrolment' };
}

export function useLesson(slug, lessonId) {
  // Null when a screen using this hook is rendered outside the player shell,
  // which is why every call below is optional.
  const { reloadOutline } = useOutletContext() ?? {};
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | locked | error
  const [gate, setGate] = useState(null);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setGate(null);
    try {
      // The outline is fetched even when the lesson turns out to be locked,
      // the locked screen still names the course and links back to it.
      const outline = await catalogApi.outline(slug);
      const all = flatten(outline.modules ?? []);
      const index = all.findIndex((l) => String(l.id) === String(lessonId));

      if (index === -1) {
        setStatus('notfound');
        return;
      }

      const entry = all[index];
      let lesson;
      try {
        lesson = await catalogApi.lesson(slug, lessonId);
      } catch (err) {
        if (err?.status === 403) {
          setGate(gateFromError(err));
          setStatus('locked');
          return;
        }
        throw err;
      }

      setComplete(Boolean(entry.complete));
      setData({
        course: outline.course,
        enrolled: Boolean(outline.enrolled),
        // The outline entry carries progress and the gate; the lesson carries
        // the content. Merged so a screen reads one object.
        lesson: { ...entry, ...lesson, id: entry.id },
        module: entry.module,
        index,
        total: all.length,
        prev: index > 0 ? all[index - 1] : null,
        next: index < all.length - 1 ? all[index + 1] : null,
        body: textToBlocks(lesson.body),
        transcript: lesson.transcript ?? [],
        // Where they got to last time, or 0. The server decides whether there
        // is anything worth resuming, so the player just honours the number.
        resumeAt: lesson.resumeAt ?? 0,
        // This lesson's downloads, and only this lesson's (L1). What the
        // instructor attached HERE, so the slide deck sits beside the video it
        // belongs to.
        //
        // The course record's `media` used to be appended after this. It is a
        // public marketing gallery with an unexpiring /files URL, so it was the
        // one row in a gated list that always opened — and it is not lesson
        // material. Course videos and handouts belong to a lesson, where the
        // preview-or-enrol rule reaches them.
        resources: (lesson.resources ?? []).map((r) => ({
          id: r._id,
          lessonId: entry.id,
          title: r.title || r.name || 'Resource',
          kind: r.kind ?? 'doc',
          sizeBytes: r.sizeBytes ?? 0,
          // Either it is ours, and needs a signed URL, or it is a link.
          signed: Boolean(r.hasFile),
          url: r.url ?? '',
        })),
      });
      setStatus('ready');
    } catch (err) {
      if (err?.status === 404) {
        setStatus('notfound');
        return;
      }
      setError(err?.message ?? 'Could not load this lesson');
      setStatus('error');
    }
  }, [slug, lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  // Completion is one-way on the server: it records that the lesson was
  // finished, and finishing the last one issues the certificate. There is no
  // un-complete, so the button reflects that rather than pretending to toggle.
  const markComplete = useCallback(async () => {
    if (complete) return null;
    // Optimistic: the tick is the feedback for the click, and a failure rolls
    // it back rather than leaving the button unresponsive.
    setComplete(true);
    try {
      const result = await progressApi.completeLesson(lessonId);
      // The player shell fetched the outline when it mounted and has no idea
      // this just happened, so its progress bar and its rail keep showing the
      // course as it was — a two-lesson course read 50% with both lessons
      // finished. Telling it here rather than in each of the three lesson
      // screens means none of them can forget to.
      await reloadOutline?.();
      return result;
    } catch (err) {
      setComplete(false);
      setError(err?.message ?? 'Could not save your progress');
      return null;
    }
  }, [complete, lessonId, reloadOutline]);

  return { data, status, gate, error, complete, markComplete, reload: load };
}
