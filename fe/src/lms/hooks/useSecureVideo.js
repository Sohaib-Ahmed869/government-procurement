import { useCallback, useEffect, useRef, useState } from 'react';
import { videoApi } from '../../api/lms.js';

// How far ahead of expiry to fetch a replacement. The margin matters: a link
// that lapses mid-lesson stalls playback, and re-requesting after the failure
// means the learner sees an error before the recovery.
const REFRESH_MARGIN_SECONDS = 60;
// Floor on the retry gap, so a server sending a very short (or already past)
// expiry can't turn this into a request loop.
const MIN_WAIT_MS = 5_000;

// Protected, expiring video links (L2).
//
// GET /lms/lessons/:id/video-url returns { url, expiresAt }. A signed S3 URL
// valid for five minutes, issued only to someone the server agrees is enrolled.
// The S3 key never reaches the browser, so a link that escapes is worth minutes
// rather than forever. This hook keeps a live one in hand, refreshing ahead of
// expiry rather than reacting to a failure.
//
// NOTE: a signed URL limits *distribution* of the link, not what a determined
// viewer can capture once it plays. Genuinely protecting the file needs
// encrypted HLS/DASH with DRM key rotation, which is a media-pipeline decision
// on the backend. See the caveat in SecureVideoPlayer.
export function useSecureVideo(lessonId, { enabled = true, hls = false } = {}) {
  const [state, setState] = useState({ url: null, expiresAt: null, status: 'loading' });
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled || !lessonId) {
      setState({ url: null, expiresAt: null, status: 'idle' });
      return undefined;
    }

    let alive = true;

    const load = async () => {
      try {
        // An HLS lesson gets a playlist URL; everything else keeps the signed
        // MP4 it has always had. Same { url, expiresAt } either way, so the
        // refresh cycle below does not care which it is holding.
        const { url, expiresAt } = hls
          ? await videoApi.hlsUrl(lessonId)
          : await videoApi.signedUrl(lessonId);
        if (!alive) return;

        const expiry = Date.parse(expiresAt);
        setState({ url, expiresAt: expiry, status: 'ready', kind: hls ? 'hls' : 'mp4' });

        // Re-issue before this one lapses. Reschedule from the server's expiry,
        // not from a local constant. The TTL is the server's to decide, and
        // hard-coding it here means a change there silently breaks refresh.
        const wait = Math.max(
          MIN_WAIT_MS,
          expiry - Date.now() - REFRESH_MARGIN_SECONDS * 1000,
        );
        clear();
        timerRef.current = setTimeout(load, wait);
      } catch (err) {
        if (!alive) return;
        // 403 is not a transient failure. The learner isn't entitled to this
        // video, so it stops rather than retrying against a standing refusal.
        setState({
          url: null,
          expiresAt: null,
          status: err?.status === 403 ? 'forbidden' : 'error',
          error: err?.message ?? '',
        });
      }
    };

    load();
    return () => {
      alive = false;
      clear();
    };
  }, [lessonId, enabled, hls, clear]);

  return state;
}
