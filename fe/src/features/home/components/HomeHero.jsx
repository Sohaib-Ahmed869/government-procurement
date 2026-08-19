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
// The bundled fallback is boardroom footage — advisers around a table with
// tender documents and a city skyline behind them — so the hero reads as the
// work the firm does even before the CMS has anything to say. It replaces the
// sunset clip that was standing in here, which said nothing about procurement.
// The poster is its own first frame, so the still and the footage are the same
// shot and the swap from one to the other is invisible.
//
// Two ways to change it, neither needing a code change beyond the second: set a
// videoUrl in the CMS, or drop a new file in over this import.
const FALLBACK_VIDEO = fallbackVideo;

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

  const forAudience = copy?.[audience] || {};
  const { eyebrow, heading, subheading } = forAudience;

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

      <div className="home-hero__inner hm-shell">
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
