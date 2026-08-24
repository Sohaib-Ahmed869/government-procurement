/* ---------------------------------------------------------------------------
   Big-screen scaling that does not fight the browser's own zoom.

   Pages are designed at a 1440px content width and scaled up to fill a wider
   window, so a 4K monitor gets the laptop layout at 4K size — every text size,
   button, image and padding growing in the same proportion — rather than the
   design stranded in a column with 500px of empty either side.

   The scale used to be pure CSS: `zoom: calc(100vw / 1440px)`. That looked
   right and broke zoom completely, because browser zoom WORKS by changing the
   CSS viewport. Zoom out and 100vw grows, so the factor grew by exactly the
   amount the user had just shrunk: on a 1920px screen the page was
   pixel-identical at 50%, 80%, 100% and 125%.

   Stepping the factor through media queries does not fix it either. It rescues
   zooming OUT, but zooming IN narrows the viewport into a lower step, which
   cancels again — 200% zoom came out 6% larger than 100%.

   The coupling is the problem, so the fix is to measure something zoom does not
   change: the viewport as it would be at 100%. `devicePixelRatio` moves with
   zoom and nothing else here does, so the ratio of it to its value at load is
   the zoom level, and multiplying the current viewport by that undoes it.

   The result is a scale that holds still while the user zooms — so zoom
   multiplies on top of it and behaves exactly as it does on any other site —
   and follows the window when it is actually resized.
   ------------------------------------------------------------------------ */

const DESIGN_WIDTH = 1440;

// Below this the design is used at its natural size; there is nothing to fill.
const MIN_VIEWPORT = 1441;

// A ceiling, so an unusually wide or multi-monitor-spanning window does not
// blow the layout up to a size nobody reads at.
const MAX_SCALE = 3;

// devicePixelRatio at the last baseline, whatever the display and the OS
// scaling make it. Only its RATIO to the current value is used, so the absolute
// number does not matter — a 1x laptop and a 2x retina both start at 1.
let baseRatio = null;

// The viewport's width in PHYSICAL pixels at that same baseline, and the reason
// the baseline is no longer frozen at load.
//
// The ratio above can only see zoom CHANGES, never the zoom a page loaded with.
// That was a documented limitation and it had a visible cost: open or close the
// device toolbar and devicePixelRatio moves, so the ratio starts reporting a
// zoom the visitor never applied, and the page renders at a size it would not
// render at if you reloaded — the same window showing two different layouts
// depending on how you got there.
//
// Physical width is what tells the two apart. Zooming changes devicePixelRatio
// and innerWidth in opposite directions and leaves their product alone: the
// window still covers the same pixels on the glass. Anything else that moves
// devicePixelRatio — the device toolbar opening, a window resize, a drag to a
// second monitor — moves that product too.
//
// So: product unchanged means a zoom, and the baseline is kept, which is what
// keeps zoom working exactly as it did. Product changed means a new viewport,
// and the baseline is retaken against it — which puts the page in the state a
// reload would have put it in, rather than in a state only reachable by not
// reloading.
let basePhysicalWidth = null;

// Zoom steps land innerWidth on whole pixels, so the product drifts a pixel or
// two either side. Anything under this is rounding, not a new viewport.
const PHYSICAL_WIDTH_TOLERANCE = 4;

function physicalWidth() {
  return window.innerWidth * window.devicePixelRatio;
}

function currentZoom() {
  if (typeof window === 'undefined' || !window.devicePixelRatio) return 1;

  const physical = physicalWidth();
  const newViewport =
    baseRatio === null ||
    basePhysicalWidth === null ||
    Math.abs(physical - basePhysicalWidth) > PHYSICAL_WIDTH_TOLERANCE;

  if (newViewport) {
    baseRatio = window.devicePixelRatio;
    basePhysicalWidth = physical;
    return 1;
  }

  const zoom = window.devicePixelRatio / baseRatio;
  // Guard against a value that has gone strange — a monitor change can move
  // devicePixelRatio without any zoom at all.
  return Number.isFinite(zoom) && zoom > 0.1 && zoom < 10 ? zoom : 1;
}

function computeScale() {
  if (typeof window === 'undefined') return 1;

  // The width the window would report if the visitor were not zoomed.
  const unzoomed = window.innerWidth * currentZoom();
  if (!Number.isFinite(unzoomed) || unzoomed < MIN_VIEWPORT) return 1;

  return Math.min(unzoomed / DESIGN_WIDTH, MAX_SCALE);
}

function apply() {
  const scale = computeScale();
  const root = document.documentElement;

  // Rounded, so a one-pixel resize does not rewrite the variable and force a
  // re-layout of the whole page.
  root.style.setProperty('--gp-scale', scale.toFixed(3));

  // The width of the page box, in the design pixels the scaled subtree lays out
  // in. Everything inside `zoom` is multiplied by the scale when painted, so the
  // box has to be divided by it to come out exactly one viewport wide.
  //
  // This used to be a flat `width: 1440px`, which painted 1440 x scale. That is
  // one viewport at 100% zoom and nowhere else: zoom out and the viewport grows
  // while the painted page does not, leaving the window white beside it; zoom in
  // and the page is wider than the window and the far side is cut off.
  //
  // clientWidth rather than innerWidth or 100vw, because it excludes the
  // vertical scrollbar — the other two include it, and the page would sit a
  // scrollbar's width too wide.
  root.style.setProperty('--gp-page-width', `${(root.clientWidth / scale).toFixed(2)}px`);
}

export function startPageScale() {
  if (typeof window === 'undefined') return undefined;

  apply();

  // resize fires for a real window resize AND for a zoom; both should
  // recompute, and currentZoom() is what tells them apart.
  let frame = null;
  const onResize = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(apply);
  };

  window.addEventListener('resize', onResize);
  return () => {
    window.removeEventListener('resize', onResize);
    if (frame) window.cancelAnimationFrame(frame);
  };
}
