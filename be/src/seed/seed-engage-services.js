// Fills the WIN side of How to Engage Us from what that page is showing today:
//
//   npm run seed:engage-services
//
// The Win side used to render the Service Offering page's capability cards,
// read through the same resolver. It now has its own list (EngageService) so
// the two pages can say different things to a buyer and to a bidder, and so
// renaming a service on one does not silently rewrite the other.
//
// This is a MIGRATION, not invented content. It copies the cards that side of
// the toggle is already drawing — audience 'win' or 'both' — so the page comes
// out of the change saying exactly what it said going into it, and an editor
// starts from the real copy rather than from an empty screen. Nothing here is
// made up: every title and sentence is one already published on the site.
//
// Safe to re-run. Rows are matched on title, so a row an editor has since
// rewritten is left alone rather than reset — only genuinely new titles are
// added, and they arrive as drafts to be checked and published.
//
// `serviceKey` carries the capability's id, which is what the row's "Request a
// consultation" link used to put in `?service=`. Keeping it means a request
// still arrives naming the same service it did before.
import { connectDB, disconnectDB } from '../config/db.js';
import { Capability } from '../models/Capability.js';
import { EngageService } from '../models/EngageService.js';

async function run() {
  await connectDB();

  // The same filter features/serviceOffering/services.js applies on the site: a
  // card with no audience predates the field and counts as 'both'.
  const cards = await Capability.find({
    $or: [{ audience: 'win' }, { audience: 'both' }, { audience: { $exists: false } }],
  }).sort('order title');

  if (cards.length === 0) {
    console.log(
      '[seed-engage-services] no Win capability cards found — nothing to copy. ' +
        'Add the rows by hand in the CMS: How to Engage Us → Win Contracts.',
    );
    await disconnectDB();
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const [i, card] of cards.entries()) {
    const title = (card.title || '').trim();
    if (!title) continue;

    const existing = await EngageService.findOne({ title });
    if (existing) {
      skipped += 1;
      console.log(`[seed-engage-services] "${title}" already present — left as it is`);
      continue;
    }

    await EngageService.create({
      title,
      body: (card.body || '').trim(),
      serviceKey: String(card._id),
      order: Number(card.order) || (i + 1) * 10,
      status: 'draft',
    });
    created += 1;
    console.log(`[seed-engage-services] created "${title}" (draft)`);
  }

  console.log(
    `[seed-engage-services] done — ${created} created, ${skipped} left alone. ` +
      'New rows are DRAFTS: check each one, then publish it.',
  );

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-engage-services] failed:', err);
  process.exit(1);
});
