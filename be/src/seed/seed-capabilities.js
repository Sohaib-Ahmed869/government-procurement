// Seeds the copy for the six services on the Service Offering page (A5), one
// card per service per segment, plus one added service to show what an editor
// can do beyond the fixed six.
//
// Upserts on (key, audience) so running it twice won't create duplicates. A
// card an editor has written by hand is overwritten only if it is for the same
// service and the same segment — so edit the copy in the CMS, not here, unless
// you mean to reset it:
//   npm run seed:capabilities
import { connectDB, disconnectDB } from '../config/db.js';
import { Capability } from '../models/Capability.js';

// The wording is what actually differs between the two sides of the toggle:
// the same service means something different to a buyer and to a bidder, which
// is why each one is written out twice rather than composed from a template.
const AWARD = [
  {
    key: 'procurement-strategy',
    title: 'Procurement Strategy',
    icon: 'target',
    order: 10,
    body: 'We help you decide how to go to market before anything is published: what to buy as one package and what to split, which approach the rules allow, and where the risk in the scope actually sits. The decisions taken here shape everything that follows.',
  },
  {
    key: 'probity',
    title: 'Probity',
    icon: 'shield',
    order: 20,
    body: 'Independent probity advice and audit across the process, so the decisions your panel reaches are defensible on the record. We keep the reasoning documented as it happens, which is what protects an award when it is questioned later.',
  },
  {
    key: 'process-management',
    title: 'Process Management',
    icon: 'flow',
    order: 30,
    body: 'We run the approach to market end to end: tender documentation, addenda, the question and answer period, and the timetable that holds it together. Your team stays in control of the decisions without carrying the administration.',
  },
  {
    key: 'evaluation-negotiation',
    title: 'Evaluation & Negotiation',
    icon: 'scales',
    order: 40,
    body: 'Evaluation criteria that genuinely separate strong bids from weak ones, panels facilitated to score consistently, and negotiations run to close the gap between the offer on the table and the outcome you need.',
  },
  {
    key: 'vendor-transition',
    title: 'Vendor Transition',
    icon: 'handover',
    order: 50,
    body: 'The handover between an outgoing supplier and an incoming one, planned before award rather than after it. Transition is where a well-run procurement is most often undone, and where the contract you signed starts being tested.',
  },
  {
    key: 'contract-management',
    title: 'Contract Management',
    icon: 'document',
    order: 60,
    body: 'Once the contract is live, the value you modelled has to be realised. We set up the performance framework, the reporting cadence and the review points that keep a supplier delivering what was agreed.',
  },
];

const WIN = [
  {
    key: 'procurement-strategy',
    title: 'Procurement Strategy',
    icon: 'target',
    order: 10,
    body: 'Before a tender drops, we help you decide which opportunities are worth your time. A clear go or no-go call, an honest read of where you are competitive, and the groundwork that makes the response quicker to write when it opens.',
  },
  {
    key: 'probity',
    title: 'Probity',
    icon: 'shield',
    order: 20,
    body: 'Knowing what a buyer is obliged to do, and what they cannot do, is a practical advantage. We advise on conflicts, on what can be asked during the question period, and on how to raise a concern without damaging the relationship.',
  },
  {
    key: 'process-management',
    title: 'Process Management',
    icon: 'flow',
    order: 30,
    body: 'While the tender is open, the work is logistics as much as writing: tracking addenda, getting questions in before the deadline, and assembling a compliant response that does not fall over on a formatting rule.',
  },
  {
    key: 'evaluation-negotiation',
    title: 'Evaluation & Negotiation',
    icon: 'scales',
    order: 40,
    body: 'Our advisers have scored bids as well as written them. We show you how your response reads to a panel working through a scoring matrix, and we sit with you through clarifications, shortlisting and the negotiation that follows.',
  },
  {
    key: 'vendor-transition',
    title: 'Vendor Transition',
    icon: 'handover',
    order: 50,
    body: 'Winning is the start of the hard part. We plan mobilisation against what you actually committed to in the bid, so the first ninety days build the buyer’s confidence rather than spending it.',
  },
  {
    key: 'contract-management',
    title: 'Contract Management',
    icon: 'document',
    order: 60,
    body: 'A contract delivered well is the strongest reference you will ever have. We help you run the reporting, manage variations, and keep the performance record that the next tender panel will want to see.',
  },
];

// One service beyond the six, to show the added-service path working. It has no
// `key`, which is what marks it as an addition rather than copy for one of the
// fixed set, and it appears after them on whichever segment it is written for.
const ADDED = [
  {
    key: '',
    title: 'Spend Analysis',
    stage: 'Before anything else',
    icon: 'graph',
    // Award only: a supplier has no spend of the buyer's to analyse, so this
    // one genuinely belongs to a single segment.
    audience: 'award',
    order: 1,
    body: 'Before changing how you buy, it helps to know what you already spend and with whom. We turn your transaction data into a picture of category, supplier and contract coverage that the rest of the strategy can be built on.',
  },
  {
    key: '',
    title: 'Capability Building',
    stage: 'Ongoing',
    icon: 'graph',
    // 'both' — one card, shown on Win and on Award. The service reads the same
    // to a buyer and to a bidder, so there is no reason to write it twice.
    audience: 'both',
    order: 2,
    body: 'Training and coaching for the people who run procurements and the people who answer them. Delivered against your own live work rather than worked examples, so what your team learns is immediately in use.',
  },
];

// The three cards this script used to seed, from when the page was
// "Capabilities" and showed a "Deliver with Impact" row. They carry no key and
// no segment, so under the current page they would each appear as an *added*
// service on both sides of the toggle — three services the firm does not offer.
// Removed by title, and only when they still have no key, so an editor who has
// since attached one of them to a real service keeps their work.
const SUPERSEDED = [
  'Strategy Development',
  'Tender Design & Documentation',
  'Evaluation & Assessment',
];

async function run() {
  await connectDB();

  const dropped = await Capability.deleteMany({
    title: { $in: SUPERSEDED },
    $or: [{ key: { $exists: false } }, { key: '' }],
  });
  if (dropped.deletedCount) {
    console.log(`[seed-capabilities] removed ${dropped.deletedCount} superseded card(s)`);
  }

  const cards = [
    ...AWARD.map((c) => ({ ...c, audience: 'award' })),
    ...WIN.map((c) => ({ ...c, audience: 'win' })),
    ...ADDED,
  ];

  for (const card of cards) {
    // Added services have no key, so they are matched on their title instead —
    // otherwise every keyless card would collide with every other.
    const query = card.key
      ? { key: card.key, audience: card.audience }
      : { title: card.title, audience: card.audience };

    const existing = await Capability.findOne(query);
    if (existing) {
      Object.assign(existing, card);
      await existing.save();
      console.log(`[seed-capabilities] updated  ${card.audience.padEnd(5)} "${card.title}"`);
    } else {
      await Capability.create({ ...card, active: true });
      console.log(`[seed-capabilities] created  ${card.audience.padEnd(5)} "${card.title}"`);
    }
  }

  console.log(`[seed-capabilities] ${cards.length} cards in place`);
  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-capabilities] failed:', err);
  process.exit(1);
});
