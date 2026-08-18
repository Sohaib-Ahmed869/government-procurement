import { GATE } from '../utils/gating.js';

/* ---------------------------------------------------------------------------
   PLACEHOLDER DATA, one source for every LMS screen.

   The LMS endpoints don't exist yet, so the catalogue, My Courses and the
   course outline all read from here. Keeping it in ONE file is the point: with
   a copy per hook, the slugs and lesson counts drift apart and the pages start
   contradicting each other.

   Shapes match fe/src/api/lms.js. When the backend lands, each hook swaps its
   import for the real call and this file is deleted.

   Note: the existing /api/courses endpoint already carries title, slug, price,
   levelLabel, level, segment, resourceType, learnPoints, requirements and
   includes. The catalogue could be pointed at it today. What's missing is only
   the modules/lessons structure and enrolment state.
   ------------------------------------------------------------------------ */

// ---- Catalogue records -----------------------------------------------------
export const CATALOGUE = [
  {
    id: 'c1',
    slug: 'commonwealth-procurement-rules',
    title: 'Commonwealth Procurement Rules in Practice',
    summary:
      'Work through the CPRs the way a practitioner actually meets them, from planning and approach to market, through to value for money and the record you leave behind.',
    instructor: { name: 'Dr. Helen Marsh', role: 'Principal Advisor' },
    levelLabel: 'Beginner',
    level: 'beginner',
    segment: 'award',
    resourceType: 'courses',
    modules: 5,
    lessons: 18,
    durationLabel: '6 hours',
    price: 0,
    currency: 'AUD',
    rating: 4.8,
    ratingCount: 124,
    learners: 1840,
    featured: true,
    accent: 0,
  },
  {
    id: 'c2',
    slug: 'ethics-and-probity',
    title: 'Ethics & Probity in Procurement',
    summary:
      'The probity obligations that sit across every procurement, and how to evidence that you met them when the decision is reviewed.',
    instructor: { name: 'Ravi Anand', role: 'Probity Advisor' },
    levelLabel: 'Beginner',
    level: 'beginner',
    segment: 'award',
    resourceType: 'courses',
    modules: 4,
    lessons: 12,
    durationLabel: '4 hours',
    price: 0,
    currency: 'AUD',
    rating: 4.9,
    ratingCount: 86,
    learners: 1210,
    featured: false,
    accent: 1,
  },
  {
    id: 'c3',
    slug: 'tender-writing-essentials',
    title: 'Tender Writing Essentials',
    summary:
      'Plan, structure and write a compliant tender response that answers what was actually asked, and reads well to the panel scoring it.',
    instructor: { name: 'Sophie Lang', role: 'Bid Director' },
    levelLabel: 'Intermediate',
    level: 'intermediate',
    segment: 'win',
    resourceType: 'courses',
    modules: 6,
    lessons: 21,
    durationLabel: '8 hours',
    price: 690,
    currency: 'AUD',
    rating: 4.7,
    ratingCount: 203,
    learners: 2410,
    featured: true,
    accent: 2,
  },
  {
    id: 'c4',
    slug: 'contract-management-fundamentals',
    title: 'Contract Management Fundamentals',
    summary:
      'What happens after award: mobilisation, performance management, variations, and closing a contract out cleanly.',
    instructor: { name: 'Dr. Helen Marsh', role: 'Principal Advisor' },
    levelLabel: 'Intermediate',
    level: 'intermediate',
    segment: 'award',
    resourceType: 'courses',
    modules: 5,
    lessons: 16,
    durationLabel: '6 hours',
    price: 590,
    currency: 'AUD',
    rating: 4.6,
    ratingCount: 71,
    learners: 940,
    featured: false,
    accent: 3,
  },
  {
    id: 'c5',
    slug: 'evaluating-and-awarding-contracts',
    title: 'Evaluating and Awarding Contracts',
    summary:
      'Build a defensible evaluation plan, run the panel, and document the award so the decision stands up to scrutiny.',
    instructor: { name: 'Michael Duong', role: 'Evaluation Lead' },
    levelLabel: 'Intermediate',
    level: 'intermediate',
    segment: 'award',
    resourceType: 'courses',
    modules: 4,
    lessons: 15,
    durationLabel: '5 hours',
    price: 590,
    currency: 'AUD',
    rating: 4.5,
    ratingCount: 58,
    learners: 760,
    featured: false,
    accent: 4,
  },
  {
    id: 'c6',
    slug: 'procurement-risk-and-assurance',
    title: 'Procurement Risk and Assurance',
    summary:
      'Set a risk appetite, build the assurance framework around it, and know which reviews are worth running at which value.',
    instructor: { name: 'Ravi Anand', role: 'Probity Advisor' },
    levelLabel: 'Advanced',
    level: 'advanced',
    segment: 'award',
    resourceType: 'courses',
    modules: 6,
    lessons: 20,
    durationLabel: '9 hours',
    price: 890,
    currency: 'AUD',
    rating: 4.8,
    ratingCount: 44,
    learners: 520,
    featured: false,
    accent: 5,
  },
  // Catalogue-only, not enrolled, so these exercise the "enrol" path.
  {
    id: 'c7',
    slug: 'panel-arrangements-and-standing-offers',
    title: 'Panel Arrangements and Standing Offers',
    summary:
      'When a panel is the right vehicle, how to buy from one properly, and the traps in refreshing or extending it.',
    instructor: { name: 'Michael Duong', role: 'Evaluation Lead' },
    levelLabel: 'Intermediate',
    level: 'intermediate',
    segment: 'award',
    resourceType: 'courses',
    modules: 4,
    lessons: 13,
    durationLabel: '4 hours',
    price: 490,
    currency: 'AUD',
    rating: 4.4,
    ratingCount: 31,
    learners: 410,
    featured: false,
    accent: 1,
  },
  {
    id: 'c8',
    slug: 'indigenous-procurement-policy',
    title: 'The Indigenous Procurement Policy',
    summary:
      'Meeting IPP targets in practice: set-asides, the mandatory minimum requirements, and reporting that holds up.',
    instructor: { name: 'Sophie Lang', role: 'Bid Director' },
    levelLabel: 'Beginner',
    level: 'beginner',
    segment: 'general',
    resourceType: 'courses',
    modules: 3,
    lessons: 9,
    durationLabel: '3 hours',
    price: 0,
    currency: 'AUD',
    rating: 4.9,
    ratingCount: 67,
    learners: 1090,
    featured: true,
    accent: 3,
  },
  {
    id: 'c9',
    slug: 'negotiation-for-procurement',
    title: 'Negotiation for Procurement',
    summary:
      'Preparing, framing and running a negotiation inside the constraints a public buyer works under.',
    instructor: { name: 'Dr. Helen Marsh', role: 'Principal Advisor' },
    levelLabel: 'Advanced',
    level: 'advanced',
    segment: 'win',
    resourceType: 'courses',
    modules: 5,
    lessons: 14,
    durationLabel: '7 hours',
    price: 990,
    currency: 'AUD',
    rating: 4.7,
    ratingCount: 39,
    learners: 380,
    featured: false,
    accent: 0,
  },
];

// ---- Enrolment overlay ------------------------------------------------------
// Keyed by slug. Only these courses appear in My Courses.
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

// ---- C2 · Coupons -----------------------------------------------------------
// Validation is a server job. A discount the client can invent is a discount
// anyone can invent. These exist so the checkout field has something to accept
// and reject while there is no API.
export const COUPONS = {
  WELCOME10: { code: 'WELCOME10', kind: 'percent', value: 10, label: '10% off your first course' },
  GOV50: { code: 'GOV50', kind: 'fixed', value: 50, label: '$50 off' },
  TEAM20: { code: 'TEAM20', kind: 'percent', value: 20, label: '20% off, team offer' },
};

// Placeholder-only: enrols the buyer so the confirmation screen and the course
// page agree with each other. On the real thing enrolment is created by the
// server when payment settles, never by the browser.
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

// ---- Course detail copy -----------------------------------------------------
// Mirrors the fields the existing Course model already carries.
export const DETAIL = {
  'commonwealth-procurement-rules': {
    learnPoints: [
      'Apply the CPRs to a real approach to market, not just quote them',
      'Judge value for money beyond lowest price, and record how you did',
      'Choose between open tender, limited tender and a panel with confidence',
      'Recognise when an exemption genuinely applies, and when it does not',
      'Build a procurement record that survives an audit or an FOI request',
    ],
    requirements: [
      'No prior procurement experience needed',
      'Access to your own agency’s procurement policy is useful but not required',
    ],
    whoShouldTake: [
      { title: 'New procurement officers', text: 'Anyone running their first approach to market inside a Commonwealth entity.' },
      { title: 'Program and project staff', text: 'People who commission work and need to understand what their procurement team is asking for.' },
    ],
    includes: ['6 hours of content', '18 lessons across 5 modules', '4 auto-marked quizzes', 'Downloadable templates', 'Certificate on completion'],
  },
};

// ---- Outlines (L1 · modules → lessons) --------------------------------------
// Module names are real; lesson titles are generated from them so the counts
// always match the catalogue record above. The first lesson of every course is
// a free preview (L1).
const MODULE_NAMES = {
  'commonwealth-procurement-rules': ['Foundations of the CPRs', 'Planning a procurement', 'Approaching the market', 'Value for money', 'The procurement record'],
  'ethics-and-probity': ['Why probity matters', 'Conflicts of interest', 'Confidentiality and fair dealing', 'Evidencing probity'],
  'tender-writing-essentials': ['Reading the request properly', 'Structuring a compliant response', 'Writing to the criteria', 'Pricing and commercials', 'Review and quality control', 'Submission and debrief'],
  'contract-management-fundamentals': ['Mobilisation', 'Managing performance', 'Variations and disputes', 'Payments and assurance', 'Closing out'],
  'evaluating-and-awarding-contracts': ['Building the evaluation plan', 'Running the panel', 'Scoring and moderation', 'Award and debrief'],
  'procurement-risk-and-assurance': ['Risk appetite', 'The assurance framework', 'Identifying procurement risk', 'Treatments and controls', 'Gateway reviews', 'Reporting'],
  'panel-arrangements-and-standing-offers': ['When to use a panel', 'Buying from a panel', 'Refresh and extension', 'Managing panel performance'],
  'indigenous-procurement-policy': ['The policy and its targets', 'Set-asides in practice', 'Reporting and evidence'],
  'negotiation-for-procurement': ['Preparing to negotiate', 'Framing the conversation', 'Running the session', 'Concessions and trade-offs', 'Recording the outcome'],
};

const LESSON_KINDS = ['video', 'text', 'video', 'text', 'quiz'];

// Distributes a course's lessons across its modules and resolves each lesson's
// state from the enrolment. The same job the backend will do server-side.
export function buildOutline(course) {
  const names = MODULE_NAMES[course.slug] ?? [];
  const enrolment = ENROLMENTS[course.slug] ?? null;
  const gate = enrolment?.next?.gate ?? null;

  // Spread lessons as evenly as the counts allow, remainder to the front.
  const base = Math.floor(course.lessons / course.modules);
  const extra = course.lessons % course.modules;

  let n = 0;
  return names.map((name, mi) => {
    const count = base + (mi < extra ? 1 : 0);
    const lessons = Array.from({ length: count }, (_, li) => {
      n += 1;
      const kind = LESSON_KINDS[(mi + li) % LESSON_KINDS.length];
      const complete = enrolment ? n <= enrolment.lessonsDone : false;
      const preview = n === 1;

      // Drip locks everything from the module after the last completed one;
      // a prerequisite locks the whole course except its preview.
      let lessonGate = null;
      if (gate?.reason === GATE.PREREQ && !preview) lessonGate = gate;
      else if (gate?.reason === GATE.DRIP && !complete && mi >= 1 && !preview) lessonGate = gate;
      else if (!enrolment && !preview) lessonGate = { reason: GATE.ENROLMENT };

      return {
        id: `l-${mi + 1}-${li + 1}`,
        title: li === 0 ? name : `${name}, part ${li + 1}`,
        kind,
        minutes: kind === 'quiz' ? 10 : 12 + ((mi + li) % 4) * 4,
        complete,
        preview,
        gate: lessonGate,
        current: enrolment?.next?.id === `l-${mi + 1}-${li + 1}`,
      };
    });

    return {
      id: `m-${mi + 1}`,
      title: name,
      order: mi + 1,
      lessons,
      minutes: lessons.reduce((s, l) => s + l.minutes, 0),
      complete: lessons.every((l) => l.complete),
    };
  });
}

// ---- L3 · Activity ----------------------------------------------------------
// Minutes learned, at two resolutions. Held here rather than in the dashboard
// so the dashboard's week and the progress page's quarter come from one source
// and can't disagree about the same days.
export const WEEK_ACTIVITY = [
  { label: 'Mon', minutes: 45 },
  { label: 'Tue', minutes: 0 },
  { label: 'Wed', minutes: 72 },
  { label: 'Thu', minutes: 30 },
  { label: 'Fri', minutes: 95 },
  { label: 'Sat', minutes: 0 },
  { label: 'Sun', minutes: 25, current: true },
];

// Twelve weeks, oldest first. The last entry is the week in progress, which is
// why it is lower than the ones around it.
export const QUARTER_ACTIVITY = [
  { label: '25 May', minutes: 120 },
  { label: '1 Jun', minutes: 210 },
  { label: '8 Jun', minutes: 165 },
  { label: '15 Jun', minutes: 0 },
  { label: '22 Jun', minutes: 95 },
  { label: '29 Jun', minutes: 240 },
  { label: '6 Jul', minutes: 305 },
  { label: '13 Jul', minutes: 180 },
  { label: '20 Jul', minutes: 60 },
  { label: '27 Jul', minutes: 225 },
  { label: '3 Aug', minutes: 290 },
  { label: '10 Aug', minutes: 267, current: true },
];

// ---- L4 · Learning paths ----------------------------------------------------
// A path is an ordered program of courses. `requires` names the slugs that must
// be complete before a step opens. The prerequisite half of L4. The server
// resolves this against real completions; usePaths does it here.
export const PATHS = [
  {
    id: 'p1',
    slug: 'procurement-practitioner',
    title: 'Procurement Practitioner',
    summary:
      'The core program for anyone running procurements inside a Commonwealth entity, from the rules themselves through to evaluating, awarding and assuring the outcome.',
    accent: 0,
    certificateTitle: 'Certified Procurement Practitioner',
    steps: [
      { slug: 'commonwealth-procurement-rules', requires: [] },
      { slug: 'ethics-and-probity', requires: [] },
      { slug: 'evaluating-and-awarding-contracts', requires: ['commonwealth-procurement-rules'] },
      { slug: 'procurement-risk-and-assurance', requires: ['evaluating-and-awarding-contracts'] },
    ],
  },
  {
    id: 'p2',
    slug: 'bid-and-tender-specialist',
    title: 'Bid and Tender Specialist',
    summary:
      'For suppliers responding to government. Learn how the buyer evaluates, then how to write a response that answers what was actually asked.',
    accent: 2,
    certificateTitle: 'Certified Bid and Tender Specialist',
    steps: [
      { slug: 'commonwealth-procurement-rules', requires: [] },
      { slug: 'tender-writing-essentials', requires: [] },
      { slug: 'negotiation-for-procurement', requires: ['tender-writing-essentials'] },
    ],
  },
  {
    id: 'p3',
    slug: 'contract-manager',
    title: 'Contract Manager',
    summary:
      'What happens after award: mobilisation, performance, variations, and closing a contract out cleanly.',
    accent: 3,
    certificateTitle: 'Certified Contract Manager',
    steps: [
      { slug: 'contract-management-fundamentals', requires: [] },
      { slug: 'panel-arrangements-and-standing-offers', requires: [] },
      { slug: 'procurement-risk-and-assurance', requires: ['contract-management-fundamentals'] },
    ],
  },
];

// ---- L4 · Certificates ------------------------------------------------------
// `template` is what makes them "fully customisable". Every visual decision is
// data, so the instructor-facing designer (R1) edits a record rather than the
// component. Add fields here and the renderer picks them up.
export const CERTIFICATES = [
  {
    id: 'c-118',
    kind: 'course',
    courseSlug: 'ethics-and-probity',
    title: 'Ethics & Probity in Procurement',
    issuedAt: '2026-08-10T16:40:00+10:00',
    credentialId: 'GP-EP-2026-00118',
    hours: 4,
    template: {
      accent: '#0a3114',
      accentSoft: '#7ee2a8',
      orientation: 'landscape',
      seal: 'award',
      bodyCopy: 'has successfully completed the course',
      signatory: { name: 'Dr. Helen Marsh', role: 'Principal Advisor' },
      issuer: 'Government Procurement',
      showHours: true,
    },
  },
];

// Downloadable resources attached to a course (L1).
export const RESOURCES = {
  'commonwealth-procurement-rules': [
    { id: 'r1', title: 'Approach to market checklist', kind: 'pdf', sizeLabel: '240 KB' },
    { id: 'r2', title: 'Value for money assessment template', kind: 'doc', sizeLabel: '86 KB' },
    { id: 'r3', title: 'Procurement record cover sheet', kind: 'doc', sizeLabel: '52 KB' },
  ],
};
