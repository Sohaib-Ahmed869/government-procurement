import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAudience } from '../../../context/AudienceContext.jsx';
import { useMountReveal } from '../../../hooks/useMountReveal.js';
import { homeHeroApi, heroCopyCache } from '../../../api';
import posterImage from '../../../assets/images/HeroPoster.jpg';
import fallbackVideo from '../../../assets/HeroVideo.mp4';
import './HomeHero.css';

// A1 — the video-led hero.
//
// The loop is a background, not content: muted, looping, no controls, and the
// headline sits over it. Two rules follow from that. It carries no audio track
// worth hearing, so autoplay is allowed everywhere; and it must never be the
// only way the page reads, so `poster` carries a still of the same footage and
// the scrim under the copy is drawn whether or not the video ever plays.
//
// The source is CMS copy (Pages → Homepage), the same as the words are, so the
// clip can be swapped without a deploy.
//
// The bundled fallback is boardroom footage — a mixed team talking a tender
// across the table, charted documents in front of them — so the hero reads as
// the work the firm does even before the CMS has anything to say. A group shot
// rather than a close-up on one person: the whole table is the point, which is
// also why it is cut from the head of the clip, before the camera pushes in.
//
// It runs at 1.5x. At native speed the meeting barely moved over the length of
// the loop and the hero read as a still that happened to breathe; the faster
// cut also fits 21 seconds of the source into the same 14, so the loop comes
// back round to the same frame less often. Every source frame is kept rather
// than dropped to hit 25fps, hence the 37.5fps stream.
//
// The poster is its own first frame, so the still and the footage are the same
// shot and the swap from one to the other is invisible.
//
// Two ways to change it, neither needing a code change beyond the second: set a
// videoUrl in the CMS, or drop a new file in over this import.
const FALLBACK_VIDEO = fallbackVideo;

/* And the words, for the same reason the video has a fallback.

   The copy is fetched from the CMS, and until that call returns `heading` is
   undefined and the hero renders an empty scrim over the footage — the page
   opens with no headline on it. On a second visit the module cache fills it on
   the first paint, so this only bites a first-time visitor, which is exactly
   who it should not bite. It is worse the larger the screen, because there is
   more empty hero to look at while the request is in flight.

   These are the words the CMS is seeded with. An editor's version replaces them
   the moment it arrives; nothing here overwrites what the CMS holds. */
const FALLBACK_COPY = {
  award: {
    eyebrow: 'Award government contracts',
    heading: 'Procure with Confidence',
    subheading:
      'Supporting government agencies and public sector organisations with end-to-end procurement advisory, ensuring that contracts are awarded fairly, efficiently and in line with best practice.',
  },
  win: {
    eyebrow: 'Win government contracts',
    heading: 'Bid with Confidence',
    subheading:
      'Supporting suppliers and bidders through every stage of a government procurement, from the decision to respond through to mobilising the contract you have won.',
  },
};

export default function HomeHero() {
  const { audience } = useAudience();

  // Both segments arrive in one call, so flipping the toggle doesn't refetch.
  // Seeded from the module-level cache, so a second visit renders the copy on
  // the first paint instead of waiting on the network again.
  const [copy, setCopy] = useState(heroCopyCache.get);
  useEffect(() => {
    let alive = true;
    homeHeroApi
      .get()
      .then((data) => {
        if (!data) return;
        heroCopyCache.set(data);
        if (alive) setCopy(data);
      })
      .catch(() => {
        /* leave whatever is already on screen */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Field by field rather than object by object: the CMS may hold a heading and
  // no eyebrow, and falling back wholesale would then drop the editor's heading
  // as well as filling the gap.
  const saved = copy?.[audience] || {};
  const preset = FALLBACK_COPY[audience] || FALLBACK_COPY.award;
  const eyebrow = saved.eyebrow || preset.eyebrow;
  const heading = saved.heading || preset.heading;
  const subheading = saved.subheading || preset.subheading;

  // `videoUrl` is shared across both segments — one clip behind the hero, since
  // the toggle recolours the tint over it rather than swapping the footage.
  const videoUrl = copy?.videoUrl || FALLBACK_VIDEO;
  const poster = copy?.posterUrl || posterImage;

  // Reveal on mount, and again each time the audience toggle changes.
  const mounted = useMountReveal();

  // A source that 404s or a codec the browser won't take fires `error` on the
  // <video>; dropping it from the tree then leaves the poster showing as a
  // plain image rather than a black rectangle with a broken-media glyph.
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef(null);

  /* A1 — the hero ends exactly where the window does.

     Its height used to be `100svh minus a hard-coded 140px` for the chrome
     above it, which is right only on the screens where that stack happens to be
     140px tall. It is not a constant: the announcement banner is CMS copy, so it
     wraps to two lines on some messages and disappears entirely once a visitor
     dismisses it, and above 1441px the whole page sits inside a `zoom`ed subtree
     where a viewport unit and a layout pixel stop being the same length. The
     footage stopped short of the fold on some screens and ran past it on others.

     Nothing here needs to know what is above it — only how far down the window
     this block starts, which is the one thing that can simply be measured. The
     distance from there to the bottom of the viewport is the height it should
     be. Written back as a custom property rather than an inline style so the
     stylesheet keeps both the pre-measurement fallback and the short-window
     rules that tighten the copy.

     Divided by --gp-scale because the measurement is in painted pixels and the
     property is consumed inside the zoomed subtree, where lengths are in design
     pixels — see lib/pageScale.js. */
  const innerRef = useRef(null);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;

    const measure = () => {
      const scale =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gp-scale')) || 1;
      // Distance down the DOCUMENT, not down the viewport: a resize can land
      // while the visitor is scrolled, and this is the number that holds still.
      const top = el.getBoundingClientRect().top + window.scrollY;
      const fill = (window.innerHeight - top) / scale;
      el.style.setProperty('--home-hero-fill', `${Math.max(0, Math.round(fill))}px`);
    };

    measure();
    window.addEventListener('resize', measure);

    // The chrome above can change height after this first runs — the banner is
    // dismissible, and its copy arrives from the CMS a moment after first paint.
    const chrome = document.querySelector('.page-layout__chrome');
    const observer =
      chrome && typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (observer) observer.observe(chrome);

    return () => {
      window.removeEventListener('resize', measure);
      if (observer) observer.disconnect();
    };
  }, []);

  // Some browsers refuse autoplay until the element is muted in the DOM rather
  // than only in the attribute, and iOS additionally wants the play() call.
  // Failing that, the poster is already correct, so the rejection is ignored.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    const attempt = el.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
  }, [videoUrl]);

  return (
    <section
      className={`home-hero${mounted ? ' is-in' : ''}`}
      data-audience={audience}
      id="home-hero"
    >
      <div className="home-hero__media">
        {!videoFailed && (
          <video
            ref={videoRef}
            className="home-hero__video"
            // The loader looks for this to decide when the hero is actually
            // ready — see components/shared/SiteLoader.jsx.
            data-hero-video=""
            src={videoUrl}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            // `metadata` fetched just enough to know the duration, so the
            // poster sat there until the first frames arrived and the hero
            // visibly switched from still to footage a second in. `auto` asks
            // for the media itself up front; the loader then holds the page
            // until it can play, so the visitor never sees the swap.
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            onError={() => setVideoFailed(true)}
          />
        )}
        {videoFailed && <img className="home-hero__video" src={poster} alt="" />}

        {/* Two washes: a brand-tinted one from the left so the footage belongs
            to the active segment, and a vertical scrim so the headline holds
            its contrast wherever the frame happens to be light. */}
        <div className="home-hero__tint" />
      </div>

      <div className="home-hero__inner hm-shell" ref={innerRef}>
        {/* The lines carry `hm-reveal` one by one rather than the column
            carrying it for all of them. As a single block the hero faded in
            flat, with no stagger at all, which is why it read as a different
            (and faster) animation from every other page's hero — those step
            their title, lede and action apart by --gp-reveal-step. */}
        <div className="home-hero__col">
          {/* Each line renders only once the CMS has one for it, so the first
              paint of a cold load is blank rather than wrong. */}
          {eyebrow && <p className="home-hero__eyebrow hm-reveal">{eyebrow}</p>}
          {heading && <h1 className="home-hero__title hm-reveal" data-delay="1">{heading}</h1>}
          {subheading && (
            <p className="home-hero__lede hm-reveal" data-delay="2">
              {subheading}
            </p>
          )}

          {/* One action only. The hero used to carry a second, ghost button to
              the Service Offering page; the ribbon already goes there, and two
              calls to action at the top of the page split the one thing this
              hero is asking for. */}
          <div className="home-hero__actions hm-reveal" data-delay="3">
            <Link className="hm-btn hm-btn--accent" to="/book-a-consultation">
              Request a Consultation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
