import { CATALOGUE, ENROLMENTS, RESOURCES, buildOutline } from './placeholderData.js';

/* ---------------------------------------------------------------------------
   PLACEHOLDER lesson bodies, transcripts and quizzes.

   Split from placeholderData.js only for size. It is still one source per
   concern. Deleted alongside it when /api/lms lands.
   ------------------------------------------------------------------------ */

// Flattens a course to a single ordered lesson list, which is what prev/next
// navigation needs.
export function flattenLessons(course) {
  return buildOutline(course).flatMap((mod) =>
    mod.lessons.map((lesson) => ({ ...lesson, module: mod })),
  );
}

// A hand-written body for the lesson the placeholder learner is actually up to;
// everything else gets a structurally identical generated one so the page
// renders for any lesson you click.
const BODIES = {
  'commonwealth-procurement-rules:l-3-4': [
    { type: 'p', text: 'An approach to market is the point where your planning becomes public. Everything you decided in the planning phase (the requirement, the evaluation criteria, the weightings, the conditions of participation) is now fixed in the eyes of the market, and changing it later is expensive at best and fatal to the process at worst.' },
    { type: 'h', text: 'What has to be settled before you go out' },
    { type: 'p', text: 'The CPRs do not prescribe a template, but they do require that the process you run is the process you told the market you would run. In practice that means four things are locked before release:' },
    { type: 'ul', items: [
      'The statement of requirement, in enough detail that responses are comparable',
      'The evaluation criteria and their relative importance',
      'Any conditions for participation, and how they will be tested',
      'The timetable, including the closing time and the contact channel',
    ] },
    { type: 'callout', tone: 'note', title: 'Why the weightings matter early', text: 'If you set weightings after seeing responses, you cannot demonstrate that the outcome was not reverse-engineered. Auditors look for the timestamp on the evaluation plan.' },
    { type: 'h', text: 'Choosing the right approach' },
    { type: 'p', text: 'Open tender is the default for procurements at or above the relevant threshold. Limited tender is available only where one of the listed exemptions genuinely applies, and "we are short of time" is not one of them. A panel or standing offer is not a shortcut around either; buying from a panel is still a procurement, and still needs a documented value-for-money assessment proportionate to the spend.' },
    { type: 'callout', tone: 'warn', title: 'A common mistake', text: 'Treating a panel as pre-approved for any purchase. The panel establishes the pool; it does not establish value for money for the specific buy.' },
    { type: 'p', text: 'In the next lesson we turn to value for money itself: what it actually requires beyond price, and what the record needs to show.' },
  ],
};

function generateBody(lesson) {
  return [
    { type: 'p', text: `This lesson covers ${lesson.title.toLowerCase()} and where it sits in the wider process. Work through it alongside your own agency's policy. The principles are consistent, but the thresholds and delegations differ.` },
    { type: 'h', text: 'Key principles' },
    { type: 'ul', items: [
      'Be clear about what you are buying before you approach the market',
      'Apply the process proportionately to the value and risk of the procurement',
      'Record the reasoning at the time, not afterwards',
    ] },
    { type: 'callout', tone: 'note', title: 'Keep in mind', text: 'A defensible decision is one where a reasonable person, reading only your record, would understand why you decided as you did.' },
    { type: 'p', text: 'The downloadable resources for this course include a checklist you can apply directly to your next procurement.' },
  ];
}

// Transcript for the sample video (L2), synced to the player's clock.
const TRANSCRIPT = [
  { t: 0, text: 'In this lesson we are going to look at the approach to market: what has to be settled before you go out, and why.' },
  { t: 11, text: 'The approach to market is the point where your planning becomes public.' },
  { t: 19, text: 'Everything you decided in planning is now fixed in the eyes of the market.' },
  { t: 27, text: 'Changing it later is expensive at best, and fatal to the process at worst.' },
  { t: 35, text: 'The rules do not prescribe a template. What they require is that the process you run is the process you said you would run.' },
  { t: 47, text: 'So four things are locked before release. First, the statement of requirement.' },
  { t: 57, text: 'It needs enough detail that the responses you get back are actually comparable.' },
  { t: 66, text: 'Second, the evaluation criteria and their relative importance.' },
  { t: 75, text: 'Set the weightings before you see any responses. This matters more than people expect.' },
  { t: 85, text: 'If you set them afterwards, you cannot show the outcome was not reverse-engineered.' },
  { t: 95, text: 'Third, any conditions for participation, and how you will test them.' },
  { t: 104, text: 'And fourth, the timetable: the closing time and the single contact channel.' },
  { t: 114, text: 'In the next lesson we will turn to value for money itself.' },
];

// Question banks (L3). One real set for the CPR quiz; a generic fallback keeps
// every other quiz link working.
const QUIZZES = {
  'commonwealth-procurement-rules': {
    title: 'Approaching the market',
    passMark: 70,
    timeLimitMins: 10,
    questions: [
      {
        id: 'q1',
        type: 'single',
        prompt: 'When must evaluation criteria and their weightings be settled?',
        options: [
          { id: 'a', text: 'Before the approach to market is released' },
          { id: 'b', text: 'After responses close, but before evaluation begins' },
          { id: 'c', text: 'During evaluation, once the field is understood' },
          { id: 'd', text: 'Only if a complaint is received' },
        ],
        correct: ['a'],
        explanation:
          'Weightings set after responses are visible cannot be shown to be free of hindsight. The evaluation plan should be dated before release.',
      },
      {
        id: 'q2',
        type: 'multi',
        prompt: 'Which of these must be settled before an approach to market is released? Select all that apply.',
        options: [
          { id: 'a', text: 'The statement of requirement' },
          { id: 'b', text: 'The evaluation criteria' },
          { id: 'c', text: 'The preferred supplier' },
          { id: 'd', text: 'The closing time and contact channel' },
        ],
        correct: ['a', 'b', 'd'],
        explanation:
          'A preferred supplier identified before the market responds is the definition of a predetermined outcome.',
      },
      {
        id: 'q3',
        type: 'boolean',
        prompt: 'Buying from an established panel removes the need for a value-for-money assessment.',
        correct: ['false'],
        explanation:
          'The panel establishes the pool of suppliers. It does not establish value for money for the specific purchase, which still needs an assessment proportionate to the spend.',
      },
      {
        id: 'q4',
        type: 'single',
        prompt: 'Which of the following is NOT a valid basis for limited tender?',
        options: [
          { id: 'a', text: 'Genuine extreme urgency brought about by unforeseeable events' },
          { id: 'b', text: 'The procurement timetable has slipped and time is short' },
          { id: 'c', text: 'Only one supplier can meet the requirement for technical reasons' },
          { id: 'd', text: 'The purchase is below the relevant threshold' },
        ],
        correct: ['b'],
        explanation:
          'Poor planning is not unforeseeable. Urgency the entity created for itself does not open an exemption.',
      },
      {
        id: 'q5',
        type: 'text',
        prompt: 'Name the principle that requires the process you run to match the process you told the market you would run.',
        accept: ['transparency', 'transparent', 'procedural fairness', 'fairness'],
        explanation:
          'Transparency, with procedural fairness alongside it, is what makes an approach to market defensible on review.',
      },
    ],
  },
};

const GENERIC_QUIZ = {
  title: 'Knowledge check',
  passMark: 70,
  timeLimitMins: 8,
  questions: [
    {
      id: 'q1',
      type: 'single',
      prompt: 'What makes a procurement decision defensible on review?',
      options: [
        { id: 'a', text: 'The lowest price was selected' },
        { id: 'b', text: 'The reasoning was recorded at the time the decision was made' },
        { id: 'c', text: 'A delegate approved it afterwards' },
        { id: 'd', text: 'No complaints were received' },
      ],
      correct: ['b'],
      explanation:
        'A contemporaneous record is what allows a reviewer to follow the reasoning without relying on recollection.',
    },
    {
      id: 'q2',
      type: 'boolean',
      prompt: 'The level of process should be proportionate to the value and risk of the procurement.',
      correct: ['true'],
      explanation: 'Proportionality is a core principle. The same rigour is not required at every value.',
    },
  ],
};

// ---- Public accessors -------------------------------------------------------

// Everything a lesson screen needs: the lesson itself, its module, the course,
// prev/next for navigation, its body, and any attached downloads.
export function getLessonContext(slug, lessonId) {
  const course = CATALOGUE.find((c) => c.slug === slug);
  if (!course) return null;

  const all = flattenLessons(course);
  const index = all.findIndex((l) => l.id === lessonId);
  if (index === -1) return null;

  const lesson = all[index];
  return {
    course,
    enrolment: ENROLMENTS[slug] ?? null,
    lesson,
    module: lesson.module,
    index,
    total: all.length,
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
    body: BODIES[`${slug}:${lessonId}`] ?? generateBody(lesson),
    resources: RESOURCES[slug] ?? [],
    transcript: TRANSCRIPT,
  };
}

export function getQuiz(slug, quizId) {
  const course = CATALOGUE.find((c) => c.slug === slug);
  if (!course) return null;
  const base = QUIZZES[slug] ?? GENERIC_QUIZ;
  return { id: quizId, course, ...base };
}
