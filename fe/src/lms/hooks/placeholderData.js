import { GATE } from '../utils/gating.js';

/* ---------------------------------------------------------------------------
   WHAT IS LEFT OF THE PLACEHOLDER DATA, and why.

   This file used to be the source for every LMS screen: the catalogue, My
   Courses, the course outline, the dashboard, My Progress, learning paths,
   notes, bookmarks and certificates. All of those read the API now.

   Two things still read it, and both are commerce:

     · COUPONS — there is no discount model on the server. A coupon is a
       pricing rule, and a pricing rule the browser can read is a pricing rule
       the browser can invent.

     · grantEnrolment — the checkout's stand-in for a payment settling. On the
       real thing the enrolment is granted by a Stripe webhook when the money
       arrives, not by a promise resolving in a tab the buyer may have closed.

   Neither is a swap. Both need the payment pipeline built — pricing, tax, an
   intent, a webhook — which is a decision about how this business takes money,
   not a missing endpoint. Until that exists this file is the honest version:
   obviously fake, in one place, rather than spread through the checkout.
   ------------------------------------------------------------------------ */

export const ENROLMENTS = {
  'commonwealth-procurement-rules': {
    id: 'e1',
    lessonsDone: 11,
    minutesLeft: 24,
    lastAccessedAt: '2026-08-12T09:10:00+10:00',
    path: 'Procurement Practitioner',
    certificate: null,
    // Lesson 12 of 18. The first one after the 11 completed. buildOutline
    // spreads 18 lessons as 4/4/4/3/3, so #12 is the last of module 3.
    next: { id: 'l-3-4', title: 'Approaching the market, part 4', kind: 'video', gate: null },
  },
  'ethics-and-probity': {
    id: 'e2',
    lessonsDone: 12,
    minutesLeft: 0,
    lastAccessedAt: '2026-08-10T16:40:00+10:00',
    path: 'Procurement Practitioner',
    certificate: { id: 'c-118', earnedAt: '2026-08-10T16:40:00+10:00' },
    next: null,
  },
  'tender-writing-essentials': {
    id: 'e3',
    // Module 1 finished (4 lessons); module 2 onwards is drip-locked.
    lessonsDone: 4,
    minutesLeft: 38,
    lastAccessedAt: '2026-08-08T11:05:00+10:00',
    path: null,
    certificate: null,
    next: {
      id: 'l-2-1',
      title: 'Structuring a compliant response',
      kind: 'text',
      gate: { reason: GATE.DRIP, unlocksOn: '2026-08-19T00:00:00+10:00' },
    },
  },
  'contract-management-fundamentals': {
    id: 'e4',
    lessonsDone: 14,
    minutesLeft: 12,
    lastAccessedAt: '2026-08-11T14:20:00+10:00',
    path: null,
    certificate: null,
    next: { id: 'l-5-2', title: 'Managing variations and disputes', kind: 'video', gate: null },
  },
  'evaluating-and-awarding-contracts': {
    id: 'e5',
    lessonsDone: 0,
    minutesLeft: 210,
    lastAccessedAt: null,
    path: 'Procurement Practitioner',
    certificate: null,
    next: { id: 'l-1-1', title: 'Building the evaluation plan', kind: 'video', gate: null },
  },
  'procurement-risk-and-assurance': {
    id: 'e6',
    lessonsDone: 0,
    minutesLeft: 285,
    lastAccessedAt: null,
    path: 'Procurement Practitioner',
    certificate: null,
    next: {
      id: 'l-1-1',
      title: 'Risk appetite and the assurance framework',
      kind: 'text',
      gate: { reason: GATE.PREREQ, requires: 'Evaluating and Awarding Contracts' },
    },
  },
};

export const COUPONS = {
  WELCOME10: { code: 'WELCOME10', kind: 'percent', value: 10, label: '10% off your first course' },
  GOV50: { code: 'GOV50', kind: 'fixed', value: 50, label: '$50 off' },
  TEAM20: { code: 'TEAM20', kind: 'percent', value: 20, label: '20% off, team offer' },
};

export function grantEnrolment(slug) {
  if (ENROLMENTS[slug]) return;
  ENROLMENTS[slug] = {
    id: `e-${slug}`,
    lessonsDone: 0,
    minutesLeft: null,
    lastAccessedAt: null,
    path: null,
    certificate: null,
    next: { id: 'l-1-1', title: 'Start here', kind: 'video', gate: null },
  };
}
