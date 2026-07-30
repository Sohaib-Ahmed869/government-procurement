// Seeds the four consulting roles that were hardcoded on the Careers page
// before the openings became CMS-managed.
//
// Upserts by title, so running it twice won't create duplicates and won't touch
// any opening added through the CMS:
//   npm run seed:careers
import { connectDB, disconnectDB } from '../config/db.js';
import { CONTENT_STATUS } from '../constants/statuses.js';
import { JobOpening } from '../models/JobOpening.js';

// applyUrl is deliberately absent from these entries. The Careers page emails the
// careers inbox when an opening has no link (see CareersContent.jsx's applyHref),
// so there's nothing to seed — and leaving the key out means the Object.assign
// below can't overwrite a link an editor has since added in the CMS.
const OPENINGS = [
  {
    title: 'Graduate',
    description:
      'A structured first year in procurement, working alongside senior advisers on live engagements across the public and private sectors. You will learn how tenders are actually run and evaluated.',
    order: 10,
  },
  {
    title: 'Analyst',
    description:
      'Support delivery across the procurement lifecycle — market research, spend and data analysis, drafting tender documentation, and helping evaluation panels reach defensible decisions.',
    order: 20,
  },
  {
    title: 'Consultant',
    description:
      'Run end-to-end procurement processes with clients, from sourcing strategy through approach to market and award, with support from the wider team.',
    order: 30,
  },
  {
    title: 'Senior Consultant',
    description:
      'Lead engagements and client relationships, advise on complex or high-value procurements, and mentor the analysts and consultants working with you.',
    order: 40,
  },
];

async function run() {
  await connectDB();

  for (const opening of OPENINGS) {
    const existing = await JobOpening.findOne({ title: opening.title });
    if (existing) {
      Object.assign(existing, opening);
      await existing.save();
      console.log(`[seed-careers] updated "${existing.title}"`);
    } else {
      await JobOpening.create({ ...opening, status: CONTENT_STATUS.PUBLISHED });
      console.log(`[seed-careers] created "${opening.title}"`);
    }
  }

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-careers] failed:', err);
  process.exit(1);
});
