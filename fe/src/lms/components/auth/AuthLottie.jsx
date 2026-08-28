import { useEffect, useRef, useState } from 'react';

/* The animation on the sign-in panel.

   ---- Why it is loaded lazily -----------------------------------------------

   lottie-web is ~250KB and the animation itself is another ~360KB. Neither
   belongs in the main bundle: every visitor to the public site would carry it
   to render a screen most of them never open. Both are dynamically imported
   when this component mounts, which is only on /learn/login and /learn/signup.

   ---- Why it can fail without breaking anything -----------------------------

   If either import fails — a chunk that did not deploy, a network that dropped
   — `ready` never flips and the caller keeps showing the static motif. A
   sign-in page that will not render because a decoration failed is a worse
   outage than a sign-in page without the decoration.
*/
export default function AuthLottie({ className = '' }) {
  const host = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let anim;
    let cancelled = false;

    // Honour a reduced-motion preference by not animating at all. A looping
    // illustration is exactly the kind of movement that setting exists for.
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    (async () => {
      try {
        const [{ default: lottie }, { default: data }] = await Promise.all([
          import('lottie-web/build/player/lottie_light.min.js'),
          import('../../assets/auth-online-course.json'),
        ]);
        if (cancelled || !host.current) return;

        anim = lottie.loadAnimation({
          container: host.current,
          renderer: 'svg',
          loop: !still,
          autoplay: !still,
          animationData: data,
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
        });
        // Paused at a composed frame rather than frame 0, which on this
        // animation is a half-drawn scene.
        if (still) anim.goToAndStop(Math.floor((data.op ?? 60) * 0.6), true);
        setReady(true);
      } catch {
        /* Leave `ready` false; the caller falls back to the static motif. */
      }
    })();

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  return (
    <div
      ref={host}
      className={`${className}${ready ? ' is-ready' : ''}`}
      aria-hidden="true"
      role="presentation"
    />
  );
}
