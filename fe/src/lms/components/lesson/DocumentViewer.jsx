import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import LmsIcon from '../LmsIcon.jsx';

// pdf.js does its parsing off the main thread. Vite hands us a URL for the
// worker bundle rather than us guessing a path, so this keeps working under a
// hashed production build.
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

// Rendered width per page, in CSS pixels. The container is narrower than this
// on most screens and the canvas is scaled down to fit, which is what keeps the
// text crisp instead of soft.
const RENDER_WIDTH = 1100;

/* The document, on the page.

   It used to be a button that opened the file in another tab, which meant the
   lesson could not tell whether it had been read — the reading happened
   somewhere the app could not see. Rendering it here is what makes "read to the
   end of the document" a thing the page can actually observe, the same way it
   observes the end of a text lesson and the end of a video.

   Every page is drawn into the scroller at once rather than a page at a time.
   A document lesson is a handful of pages, and paging through it would put a
   control between the learner and the thing they came to read — as well as
   turning "scrolled to the end" into "pressed next enough times".

   `onReachedEnd` fires once the bottom of the LAST page has been on screen.

   Not every document can be drawn: a Word file or a slide deck is not a PDF,
   and a PDF hosted somewhere that refuses cross-origin reads cannot be fetched
   at all. Those fall back to an embed, and say so — see DocLessonPage, which
   decides what the fallback means for the way forward. */
export default function DocumentViewer({ url, name, onReachedEnd, onUnavailable }) {
  const scrollerRef = useRef(null);
  const endRef = useRef(null);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | failed
  const [error, setError] = useState('');

  // Held in a ref so the render loop below doesn't restart every time the
  // parent re-renders with a new closure.
  const reachedRef = useRef(onReachedEnd);
  reachedRef.current = onReachedEnd;
  const unavailableRef = useRef(onUnavailable);
  unavailableRef.current = onUnavailable;

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;
    let doc = null;
    setStatus('loading');
    setPages(0);

    const task = pdfjs.getDocument({ url, withCredentials: false });

    task.promise
      .then(async (pdf) => {
        if (cancelled) return;
        doc = pdf;
        setPages(pdf.numPages);

        const scroller = scrollerRef.current;
        if (!scroller) return;
        // Anything from a previous document, gone before the new one lands.
        scroller.querySelectorAll('.lms-docview__page').forEach((n) => n.remove());

        for (let n = 1; n <= pdf.numPages; n += 1) {
          if (cancelled) return;
          // eslint-disable-next-line no-await-in-loop
          const page = await pdf.getPage(n);
          if (cancelled) return;

          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width });

          const canvas = document.createElement('canvas');
          canvas.className = 'lms-docview__page';
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `Page ${n} of ${pdf.numPages}`);
          // Inserted before the end marker so the marker stays last, which is
          // the whole basis of "the end has been seen".
          scroller.insertBefore(canvas, endRef.current);

          // eslint-disable-next-line no-await-in-loop
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }

        if (!cancelled) setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('failed');
        setError(err?.message ?? 'This document could not be displayed here.');
        unavailableRef.current?.();
      });

    return () => {
      cancelled = true;
      task.destroy?.();
      doc?.destroy?.();
    };
  }, [url]);

  /* The end of the last page, watched inside the scroller rather than against
     the window: the document scrolls in its own box, so the page never moves.

     TWO ways of noticing, because the marker is a 1px box in a padded scroller
     and that is a fiddly thing to depend on alone. The observer's rootMargin is
     0 on purpose: pulling the bottom edge in by a few pixels, as a "count it
     slightly early" nicety, put the exclusion band OVER the marker — it sits
     inside the scroller's bottom padding — so the gate could never open however
     far you scrolled. The scroll check is the plain arithmetic version, and
     runs once on mount for a document shorter than its box. */
  useEffect(() => {
    const marker = endRef.current;
    const root = scrollerRef.current;
    if (!marker || !root || status !== 'ready') return undefined;

    const atBottom = () => root.scrollTop + root.clientHeight >= root.scrollHeight - 8;
    const check = () => {
      if (atBottom()) reachedRef.current?.();
    };

    check();
    root.addEventListener('scroll', check, { passive: true });

    let io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) reachedRef.current?.();
        },
        { root, rootMargin: '0px' },
      );
      io.observe(marker);
    }

    return () => {
      root.removeEventListener('scroll', check);
      io?.disconnect();
    };
  }, [status]);

  const scrollToEnd = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  return (
    <div className="lms-docview">
      <div className="lms-docview__bar">
        <span className="lms-docview__name">
          <LmsIcon name="pdf" />
          {name || 'Course document'}
        </span>
        {status === 'ready' && pages > 0 ? (
          <span className="lms-docview__pages">
            {pages} {pages === 1 ? 'page' : 'pages'}
            {/* Somebody on a long document should not have to drag their way to
                the bottom to unlock the way forward. */}
            <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost" onClick={scrollToEnd}>
              Skip to the end
            </button>
          </span>
        ) : null}
      </div>

      <div className="lms-docview__scroller" ref={scrollerRef} tabIndex={0}>
        {status === 'loading' ? (
          <p className="lms-empty">Loading the document…</p>
        ) : null}
        {status === 'failed' ? <p className="lms-empty">{error}</p> : null}
        {/* Always last in the box: every rendered page is inserted before it. */}
        <div className="lms-docview__end" ref={endRef} aria-hidden="true" />
      </div>
    </div>
  );
}
