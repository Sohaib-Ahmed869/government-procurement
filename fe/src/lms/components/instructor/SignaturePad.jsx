import { useCallback, useEffect, useRef, useState } from 'react';
import LmsIcon from '../LmsIcon.jsx';

/* Sign the certificate here, rather than scanning something and uploading it.

   Asking an instructor for "a PNG of your signature on a transparent
   background" is asking them to own a scanner and an image editor. Almost
   nobody has one to hand, so the field sat empty. Drawing it takes ten seconds
   with a trackpad and about two with a stylus.

   POINTER events, not mouse plus touch. One set of handlers covers mouse,
   finger and pen, and `setPointerCapture` is what keeps a stroke attached to
   the canvas when the hand runs past its edge mid-flourish — with mouse events
   the line simply stopped at the border.

   The canvas is backed at device pixel ratio and drawn at CSS pixels, so a
   signature made on a retina screen is not half resolution when it prints.

   The exported PNG is TRIMMED to the ink. A signature drawn in the middle of
   the pad and exported whole is mostly transparent margin, and that margin is
   real: the certificate places the image against the signature rule, so
   whatever blank space is baked in becomes a gap between the name and the line
   it is supposed to sit on. Trimming makes the image the signature and nothing
   else, which is what lets the layout position it exactly. */

// The pad's drawing surface, in CSS pixels. 3:1 is the shape of a signature.
const PAD_W = 620;
const PAD_H = 210;
const INK = '#12233d';
const LINE_WIDTH = 2.6;
// Kept around the trimmed ink so the strokes' antialiasing isn't clipped.
const TRIM_PAD = 6;

export default function SignaturePad({ onCancel, onUse, busy = false }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  // Whether anything has been drawn. State, because the buttons depend on it.
  const [hasInk, setHasInk] = useState(false);

  // Size the backing store once, and re-fill the stroke style. Both are lost
  // whenever the canvas is resized, which is why they live together.
  const reset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = PAD_W * dpr;
    canvas.height = PAD_H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, PAD_W, PAD_H);
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasInk(false);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  // Escape closes, as it does on every other dialog in the app.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  const pointAt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // The element is laid out responsively, so a CSS pixel on screen is not
    // necessarily a drawing pixel — scale the event back into pad space.
    return {
      x: ((e.clientX - rect.left) / rect.width) * PAD_W,
      y: ((e.clientY - rect.top) / rect.height) * PAD_H,
    };
  };

  const start = (e) => {
    if (busy) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pointAt(e);
    // A single tap is a dot, not nothing: without this a full stop or the dot
    // of an "i" placed as one press leaves no mark at all.
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(lastRef.current.x, lastRef.current.y, LINE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    setHasInk(true);
  };

  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = pointAt(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastRef.current = point;
  };

  const end = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
  };

  /* Crop to the ink and hand back a PNG.

     Scanning the alpha channel is what finds the bounds: the pad is
     transparent everywhere the pen hasn't been, so any non-zero alpha is part
     of the signature. Returns null on an empty pad rather than a blank image. */
  const exportPng = () =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;
      const { data } = ctx.getImageData(0, 0, width, height);

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (data[(y * width + x) * 4 + 3] !== 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) {
        resolve(null);
        return;
      }

      const pad = TRIM_PAD * dpr;
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(width - 1, maxX + pad);
      maxY = Math.min(height - 1, maxY + pad);

      const out = document.createElement('canvas');
      out.width = maxX - minX + 1;
      out.height = maxY - minY + 1;
      out
        .getContext('2d')
        .drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
      out.toBlob((blob) => resolve(blob), 'image/png');
    });

  const use = async () => {
    const blob = await exportPng();
    if (!blob) return;
    onUse(new File([blob], 'signature.png', { type: 'image/png' }));
  };

  return (
    <div
      className="lms-sigpad__scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Draw your signature"
    >
      <div className="lms-sigpad">
        <div className="lms-sigpad__head">
          <h2 className="lms-sigpad__title">Sign here</h2>
          <p className="lms-sigpad__hint">
            Draw with a mouse, a trackpad, a finger or a stylus. This is what prints
            on the certificate.
          </p>
        </div>

        <div className="lms-sigpad__stage">
          <canvas
            ref={canvasRef}
            className="lms-sigpad__canvas"
            style={{ aspectRatio: `${PAD_W} / ${PAD_H}` }}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
          {/* The line to sign on, drawn behind the canvas so it is a guide and
              never part of what is exported. */}
          <span className="lms-sigpad__rule" aria-hidden="true" />
          {!hasInk ? (
            <span className="lms-sigpad__placeholder" aria-hidden="true">
              Sign above the line
            </span>
          ) : null}
        </div>

        <div className="lms-sigpad__actions">
          <button
            type="button"
            className="lms-btn lms-btn--sm"
            onClick={reset}
            disabled={!hasInk || busy}
          >
            Clear
          </button>
          <span className="lms-sigpad__spacer" />
          <button type="button" className="lms-btn lms-btn--sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="lms-btn lms-btn--sm lms-btn--primary"
            onClick={use}
            disabled={!hasInk || busy}
          >
            <LmsIcon name="check" />
            {busy ? 'Saving…' : 'Use this signature'}
          </button>
        </div>
      </div>
    </div>
  );
}
