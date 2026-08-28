import { env } from '../config/env.js';
import { liveStatus, activeProvider } from '../modules/lms/live/index.js';

/* ---------------------------------------------------------------------------
   Checks the live-session provider's credentials end to end.

     npm run zoom:check          authenticate and read the host account
     npm run zoom:check -- --full  also create, update and delete a real meeting

   Why a script and not a health check: the API's /health should not be making
   calls to a third party on every probe, and the question this answers — "are
   these keys right?" — is asked at setup time, not continuously.

   `--full` creates a genuine meeting on the host's calendar a day from now and
   deletes it again. If it fails midway the meeting may survive; the id is
   printed so it can be removed by hand.
   ------------------------------------------------------------------------ */

const full = process.argv.includes('--full');
const ok = (m) => console.log(`  ok      ${m}`);
const bad = (m) => console.log(`  FAILED  ${m}`);

console.log(`\nLive sessions — ${env.live.provider}\n`);

const status = liveStatus();
if (!status.ready) {
  bad(status.message);
  console.log(`\n  reason: ${status.reason}`);
  if (status.reason === 'no-credentials') {
    console.log(
      '\n  Fill these in be/.env from the App Credentials tab of your\n' +
        '  Server-to-Server OAuth app at marketplace.zoom.us:\n\n' +
        '    ZOOM_ACCOUNT_ID=\n    ZOOM_CLIENT_ID=\n    ZOOM_CLIENT_SECRET=\n\n' +
        '  Then restart the API — .env is read once at boot.\n',
    );
  }
  process.exit(1);
}
ok('credentials are present');

const provider = activeProvider();

// 1. Can we authenticate at all? This is the check that catches a wrong account
//    id, a mistyped secret, or an app that was never activated.
let meeting;
try {
  meeting = await provider.createMeeting({
    title: 'Credential check — safe to ignore',
    description: 'Created by npm run zoom:check. Deleted immediately.',
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    durationMinutes: 15,
    timezone: 'Australia/Sydney',
  });
  ok(`authenticated, and created meeting ${meeting.meetingId}`);
} catch (err) {
  bad(String(err?.message ?? err));
  console.log(
    '\n  Common causes, in the order worth checking:\n' +
      '    · the app was never Activated (Activation tab)\n' +
      '    · missing meeting write scopes (Scopes tab)\n' +
      '    · ZOOM_USER_ID names a user who is not on this account\n' +
      '    · Account ID / Client ID / Client Secret copied from the wrong app\n',
  );
  process.exit(1);
}

if (!meeting.joinUrl) bad('no join URL came back — check the scopes');
else ok('join URL returned');
if (!meeting.hostUrl) bad('no host URL came back');
else ok('host URL returned');

if (full) {
  try {
    await provider.updateMeeting(meeting.meetingId, {
      title: 'Credential check — rescheduled',
      description: '',
      startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      durationMinutes: 30,
      timezone: 'Australia/Perth',
    });
    ok('meeting updated (reschedule works)');
  } catch (err) {
    bad(`update failed: ${err?.message ?? err}`);
  }
}

try {
  await provider.cancelMeeting(meeting.meetingId);
  ok('meeting deleted (cancel works)');
} catch (err) {
  bad(`delete failed: ${err?.message ?? err} — remove meeting ${meeting.meetingId} by hand`);
  process.exit(1);
}

console.log(
  `\n  ${env.live.provider} is working. Sessions scheduled in the LMS will get real links.\n`,
);
process.exit(0);
