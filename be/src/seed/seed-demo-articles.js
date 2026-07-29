// Adds demo insight articles so the Insights page has enough of them to show
// its "View more" button (the page lists 12 before paging).
//
//   npm run seed:demo-articles
//
// Every article created here has a slug prefixed "demo-", so they're easy to
// spot in the CMS and delete once real content exists. Upserts by slug, so
// running it twice won't duplicate them.
import { connectDB, disconnectDB } from '../config/db.js';
import { CONTENT_STATUS } from '../constants/statuses.js';
import { Article } from '../models/Article.js';

const TOPICS = ['Strategy', 'Public Sector', 'Compliance', 'Suppliers', 'Data'];

const DEMO = [
  ['Writing evaluation criteria that actually discriminate', 'Criteria that every bidder can satisfy tell a panel nothing. How to write ones that separate strong bids from weak.'],
  ['What a good approach to market looks like', 'The decisions made before a tender opens shape everything that follows — scope, timing and the questions you ask.'],
  ['Weighting price against non-price factors', 'Choosing a weighting is a judgement about what you are actually buying, not an administrative step.'],
  ['Running a defensible shortlisting process', 'Shortlisting is where challenges most often begin. Keeping the reasoning on the record protects the outcome.'],
  ['Debriefing unsuccessful bidders well', 'A good debrief improves the next round of bids and reduces the chance of a formal complaint.'],
  ['When a panel arrangement is the right tool', 'Panels save time on repeat buying, but they narrow the field. The trade-off is worth stating explicitly.'],
  ['Managing conflicts of interest on an evaluation panel', 'Declaring a conflict is the easy part; deciding what to do about it is where judgement is needed.'],
  ['Market sounding without prejudicing the process', 'Talking to suppliers early is legitimate and useful, provided everyone gets the same information.'],
  ['Contract variations and how they get out of hand', 'Most disputed variations trace back to a scope that was never tight enough at signature.'],
  ['Social procurement beyond the policy statement', 'Turning a commitment into something a panel can assess is the difference between intent and outcome.'],
  ['Reading a tender like an evaluator', 'Suppliers who understand how bids are scored write differently — and score better.'],
  ['Spend analysis as a starting point', 'Before changing how you buy, it helps to know what you already spend and with whom.'],
  ['Probity advisers: what they do and when to appoint one', 'An independent probity adviser is not a rubber stamp; used properly they surface problems early.'],
  ['Aggregating demand across agencies', 'Buying together can improve value, but only where requirements genuinely align.'],
  ['Why late tenders are almost never accepted', 'The closing time is a fairness mechanism. The exceptions are narrow and must be applied consistently.'],
  ['Documenting a direct engagement', 'Going to a single supplier can be defensible — provided the reasoning is written down at the time.'],
];

async function run() {
  await connectDB();

  const now = Date.now();
  let created = 0;
  let updated = 0;

  for (const [i, [title, excerpt]] of DEMO.entries()) {
    const slug = `demo-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;

    // Spread the publish dates a week apart so the listing has a real order.
    const publishedAt = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
    const body = `<p>${excerpt}</p><p>This is demo content used to populate the Insights listing. Replace it with a real article before publishing.</p>`;

    const fields = {
      title,
      excerpt,
      body,
      topic: TOPICS[i % TOPICS.length],
      author: 'Government Procurement',
      status: CONTENT_STATUS.PUBLISHED,
      publishedAt,
    };

    const existing = await Article.findOne({ slug });
    if (existing) {
      Object.assign(existing, fields);
      await existing.save();
      updated += 1;
    } else {
      await Article.create({ ...fields, slug });
      created += 1;
    }
  }

  const total = await Article.countDocuments({ status: CONTENT_STATUS.PUBLISHED });
  console.log(`[seed-demo-articles] created ${created}, updated ${updated}`);
  console.log(`[seed-demo-articles] ${total} published articles in total`);

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-demo-articles] failed:', err);
  process.exit(1);
});
