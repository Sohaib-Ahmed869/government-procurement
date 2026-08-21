import './Arrow.css';

/* ---------------------------------------------------------------------------
   The site's arrow, drawn rather than typed.

   "→" and "←" are glyphs the body font may not carry. Where it does not, the
   browser falls through to whatever font on the system does — so the arrow
   arrives at a different weight, a different size and off the baseline of the
   word beside it, and it changes between machines. An inline SVG is the same
   shape everywhere, sits on the text's own line, inherits its colour, and scales
   with its font-size because it is sized in `em`.

   `aria-hidden`: every one of these sits beside a label that already says where
   the link goes. Announcing "right arrow" after "Read all insights" adds
   nothing.
   ------------------------------------------------------------------------ */
export default function Arrow({ direction = 'right', className = '' }) {
  const left = direction === 'left';
  return (
    <svg
      className={`gp-arrow gp-arrow--${direction}${className ? ` ${className}` : ''}`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {left ? (
        <>
          <path d="M17 10H4" />
          <path d="m9 5-5 5 5 5" />
        </>
      ) : (
        <>
          <path d="M3 10h13" />
          <path d="m11 5 5 5-5 5" />
        </>
      )}
    </svg>
  );
}
