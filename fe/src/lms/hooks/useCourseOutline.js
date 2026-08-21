import { useCallback, useEffect, useState } from 'react';
import { catalogApi } from '../../api/lms.js';
import { toCatalogCourse } from '../utils/courseShape.js';

// Mongo ids are `_id`; the outline components were written against `id`, and
// each module's own totals aren't sent because they're a sum of what is already
// in the payload. Both are settled here so the tree components stay unchanged
// and no component has to know which shape it was handed.
function toOutlineModules(modules, nextLessonId) {
  return modules.map((m, i) => {
    const lessons = (m.lessons ?? []).map((l) => ({
      ...l,
      id: l._id,
      minutes: l.minutes ?? 0,
      current: String(l._id) === String(nextLessonId ?? ''),
    }));
    return {
      ...m,
      id: m._id,
      // `order` is a zero-based sort key, not a label. Printing it raw gave
      // learners "Module 0". Position in the sorted list is the number to show.
      order: i + 1,
      lessons,
      minutes: lessons.reduce((s, l) => s + l.minutes, 0),
      complete: lessons.length > 0 && lessons.every((l) => l.complete),
    };
  });
}

// A course's full detail, from GET /lms/courses/:slug/outline: the course
// record, its modules → lessons with each lesson's gate ALREADY RESOLVED by the
// server (L1/L4), and, if this learner is enrolled. Where they are up to.
//
// Gating stays server-resolved on purpose. The client renders the padlock; it
// never decides there should be one.
export function useCourseOutline(slug) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await catalogApi.outline(slug);
      const course = res.course ?? {};

      setData({
        course: {
          ...toCatalogCourse(course),
          // Structure is known here even though the catalogue listing can't
          // know it. The outline counted it.
          modules: res.moduleCount ?? 0,
          lessons: res.lessonCount ?? 0,
          minutesTotal: res.minutesTotal ?? 0,
        },
        enrolment: res.enrolment ?? null,
        // Taken off the site. Only reachable here because this learner is
        // already enrolled (or wrote it). See mayViewUnpublished on the server.
        offline: Boolean(res.offline),
        modules: toOutlineModules(res.modules ?? [], res.enrolment?.next?.id),
        // Marketing copy lives on the Course record itself. The same fields
        // the public site renders, so the two pages describe a course
        // identically.
        detail: {
          learnPoints: course.learnPoints ?? [],
          requirements: course.requirements ?? [],
          whoShouldTake: course.whoShouldTake ?? [],
          includes: course.includes ?? [],
        },
        // Course-wide downloads are gone: a course's materials are the
        // LESSONS' materials now, each gated by the lesson it hangs off. The
        // course record's `media` was a public marketing gallery — an
        // unexpiring /files link — and listing it here put it in the same card
        // as gated lesson downloads, where it was the one row that always
        // opened. Nothing to merge, so the card renders its empty state.
        resources: [],
      });
      setStatus('ready');
    } catch (err) {
      // 404 is a real answer. The course doesn't exist or isn't published,
      // and reads differently from the server being unreachable.
      if (err?.status === 404) {
        setStatus('notfound');
        return;
      }
      setError(err?.message ?? 'Could not load this course');
      setStatus('error');
    }
  }, [slug]);

  useEffect(() => {
    let alive = true;
    // The guard keeps a response for an old slug from landing after a newer one.
    (async () => {
      const current = slug;
      await load();
      if (!alive || current !== slug) return;
    })();
    return () => {
      alive = false;
    };
  }, [slug, load]);

  return { data, status, error, reload: load };
}
