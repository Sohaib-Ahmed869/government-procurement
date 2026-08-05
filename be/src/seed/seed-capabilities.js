// Seeds the three "Deliver with Impact" cards that were built into the
// Capabilities page before they became CMS-managed.
//
// Upserts by title, so running it twice won't create duplicates and won't touch
// a card added through the CMS:
//   npm run seed:capabilities
import { connectDB, disconnectDB } from '../config/db.js';
import { Capability } from '../models/Capability.js';

// Matches FALLBACK_CAPABILITIES in fe/src/features/advisory/capabilityIcons.js —
// the copy the page still shows if the CMS holds no cards of its own.
const CAPABILITIES = [
  {
    title: 'Strategy Development',
    body: "We craft comprehensive bid strategies that not only showcase your organisation's unique strengths, but also align seamlessly with buyer expectations.",
    icon: 'target',
    order: 10,
  },
  {
    title: 'Tender Design & Documentation',
    body: 'Building persuasive proposals, pricing models, and supporting documentation that address requirements clearly and convincingly.',
    icon: 'document',
    order: 20,
  },
  {
    title: 'Evaluation & Assessment',
    body: 'Structuring responses to meet evaluation criteria and demonstrate measurable value, ensuring your bid stands out.',
    icon: 'graph',
    order: 30,
  },
];

async function run() {
  await connectDB();

  for (const card of CAPABILITIES) {
    const existing = await Capability.findOne({ title: card.title });
    if (existing) {
      Object.assign(existing, card);
      await existing.save();
      console.log(`[seed-capabilities] updated "${existing.title}"`);
    } else {
      await Capability.create({ ...card, active: true });
      console.log(`[seed-capabilities] created "${card.title}"`);
    }
  }

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-capabilities] failed:', err);
  process.exit(1);
});
