// Seeds the founder's Our Team entry — the content that used to live in the
// frontend's static team data file, now that the roster is CMS-managed.
//
// Upserts by slug, so running it twice won't create duplicates and won't touch
// any other team member:
//   npm run seed:team
//
// The photo is not seeded: images live in S3 and are attached through the CMS
// (Content → Team → Edit → Photo). Until one is uploaded the card falls back to
// the person's initials.
import { connectDB, disconnectDB } from '../config/db.js';
import { CONTENT_STATUS } from '../constants/statuses.js';
import { TeamMember } from '../models/TeamMember.js';

// Mirrors the Our Expertise page (ExpertiseHero + AboutExpertise), so the two
// stay in step.
const FOUNDER = {
  slug: 'mohammed-kheir',
  name: 'Mohammed Kheir',
  role: 'Founder',
  location: 'Government Procurement',
  email: 'mkheir@govprocurement.com.au',
  linkedin: 'https://www.linkedin.com/company/governmentprocurement/',
  summary:
    'We help public sector teams and suppliers get government procurement right, from shaping a sourcing strategy to running fair, defensible tenders that stand up to scrutiny.',
  about: [
    'We help public sector teams and suppliers get government procurement right, from shaping a sourcing strategy to running fair, defensible tenders that stand up to scrutiny.',
    'Our advisors have sat on both sides of the table, evaluating bids and writing them. That experience shapes practical guidance you can act on, not theory.',
    'Whether you are building capability across a procurement function or preparing a single high-stakes tender, we tailor our support to where you are and what you need to achieve.',
    'The result is stronger competition, better value for money, and outcomes that are transparent and easy to justify to stakeholders and auditors alike.',
  ],
  expertise: [
    'Strategy Development',
    'Tender Design & Documentation',
    'Evaluation & Assessment',
    'Capacity Building & Training',
  ],
  // Past experience and education are left empty — no content was supplied for
  // them, and the profile page hides both sections while they are.
  pastExperience: [],
  education: [],
  hasProfile: true,
  order: 0,
  status: CONTENT_STATUS.PUBLISHED,
};

async function run() {
  await connectDB();

  const existing = await TeamMember.findOne({ slug: FOUNDER.slug });
  if (existing) {
    // Don't clobber a photo already attached through the CMS.
    Object.assign(existing, FOUNDER);
    await existing.save();
    console.log(`[seed-team] updated "${existing.name}" (slug: ${existing.slug})`);
  } else {
    const member = await TeamMember.create(FOUNDER);
    console.log(`[seed-team] created "${member.name}" (slug: ${member.slug})`);
  }

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-team] failed:', err);
  process.exit(1);
});
