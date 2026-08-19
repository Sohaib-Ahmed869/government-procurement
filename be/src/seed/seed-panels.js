// B2 — loads the Government Panels page with the panels Government Procurement
// is appointed to:
//   npm run seed:panels
//
// PANELS IS EMPTY, AND THAT IS DELIBERATE — PLEASE READ BEFORE FILLING IT.
//
// This page is a credentials page. Every row on it tells a client "you can
// engage us through this arrangement without running your own procurement".
// That makes each entry a claim about the business: which government panels the
// firm actually holds an appointment on, and under which contract number.
//
// Nobody can infer that from the codebase, and a plausible-looking placeholder
// here would be a fabricated credential — a page asserting panel appointments
// the firm may not hold, quoting reference numbers a client could try to buy
// through. An earlier draft of this file did seed a list; it was removed for
// exactly that reason. It is not the kind of content a sensible default can be
// invented for.
//
// So: paste the real list below, from whoever holds it. The shape is
//
//   {
//     group:      'Australian Government',   // the heading it sits under
//     groupOrder: 10,                        // heading position; same on every
//                                            // entry in a group, lowest wins
//     agency:     'Australian Federal Police',   // optional
//     name:       'Capability Support Services Panel',
//     reference:  'SON 3538332',             // optional, shown in brackets
//     sourceUrl:  'https://…',               // optional; no link if blank
//     order:      10,                        // position within the group
//   }
//
// which renders as:
//
//   Australian Government
//     • Australian Federal Police – Capability Support Services Panel (SON 3538332)
//
// `group` is free text, so a local council that runs its own panel gets its own
// heading — "Toowoomba Regional Council" — rather than being forced under a
// state. Reuse an existing spelling exactly, or it becomes a second heading.
//
// Entries are created as DRAFTS. A draft is visible on the live page to
// signed-in staff and to nobody else, so the list can be checked in place and
// then published from Content → Government Panels. Re-running upserts on
// group + name and never touches `status`, so anything already published stays
// published.
import { connectDB, disconnectDB } from '../config/db.js';
import { GovernmentPanel } from '../models/GovernmentPanel.js';

const PANELS = [];

async function run() {
  if (PANELS.length === 0) {
    console.log(
      '[seed-panels] nothing to seed — PANELS is empty.\n' +
        '[seed-panels] This page lists the panels the firm is appointed to, which is a\n' +
        '[seed-panels] claim about the business rather than content that can be defaulted.\n' +
        '[seed-panels] Add the real appointments to PANELS in this file, or enter them\n' +
        '[seed-panels] directly in the CMS under Content → Government Panels.',
    );
    return;
  }

  await connectDB();

  let created = 0;
  let updated = 0;

  for (const panel of PANELS) {
    const existing = await GovernmentPanel.findOne({
      group: panel.group,
      name: panel.name,
    });

    if (existing) {
      // `status` is not in the payload, so an entry already checked and
      // published stays published when this is re-run.
      Object.assign(existing, panel);
      await existing.save();
      updated += 1;
      console.log(`[seed-panels] updated ${panel.group} — "${panel.name}"`);
    } else {
      await GovernmentPanel.create({ ...panel, status: 'draft' });
      created += 1;
      console.log(`[seed-panels] created ${panel.group} — "${panel.name}" (draft)`);
    }
  }

  console.log(
    `[seed-panels] done — ${created} created, ${updated} updated. ` +
      'New entries are DRAFTS: check each one, then publish it.',
  );

  await disconnectDB();
}

run().catch((err) => {
  console.error('[seed-panels] failed:', err);
  process.exit(1);
});
