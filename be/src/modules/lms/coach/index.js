import { env } from '../../../config/env.js';
import { anthropicProvider } from './providers/anthropic.js';

/* ---------------------------------------------------------------------------
   Which AI answers, and whether one is available at all.

   The registry is the swap point. To move the coach to a different vendor:

     1. write a sibling of providers/anthropic.js exposing the same three
        members — `name`, `configured`, `ask({ system, documents, history,
        question })` returning { text, sources, refused, usage };
     2. add it to PROVIDERS below;
     3. set COACH_PROVIDER to its name and give it credentials.

   No other file changes. The controller, the course-content assembly, the
   prompt and every screen are written against that interface and name no
   vendor.

   To keep the same vendor and change the MODEL or the ACCOUNT, nothing here
   needs touching either — those are COACH_MODEL and ANTHROPIC_API_KEY.
   ------------------------------------------------------------------------ */

const PROVIDERS = {
  [anthropicProvider.name]: anthropicProvider,
};

export function activeProvider() {
  return PROVIDERS[env.coach.provider] ?? null;
}

/* Whether the coach can actually answer right now, and if not, WHY in words a
   screen can show.

   Three distinct "no"s, deliberately not collapsed into one boolean: switched
   off on purpose, misconfigured to a provider that does not exist, and
   configured but missing credentials are three different problems with three
   different fixes, and an operator reading "coach unavailable" learns nothing. */
export function coachStatus() {
  if (!env.coach.enabled) {
    return { ready: false, reason: 'disabled', message: 'The course coach is switched off.' };
  }

  const provider = activeProvider();
  if (!provider) {
    return {
      ready: false,
      reason: 'misconfigured',
      message: `No AI provider named "${env.coach.provider}" is registered.`,
    };
  }

  if (!provider.configured) {
    return {
      ready: false,
      reason: 'no-credentials',
      message: 'The course coach has no API credentials configured.',
    };
  }

  return { ready: true, reason: 'ready', provider: provider.name, model: env.coach.model };
}
