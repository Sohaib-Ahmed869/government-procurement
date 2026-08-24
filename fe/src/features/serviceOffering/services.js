// A5 — the six services, listed in full under both sides of the toggle.
//
// These are the names the brief fixes (Procurement strategy; probity; process
// management; evaluation & negotiation; vendor transition; contract
// management), so the *set* is not editable — six services under Win and the
// same six under Award is the structure the page is built on. What each card
// says about a service is CMS copy (Service Offering in the admin), because the
// same service means something different to the two audiences: probity is an
// obligation you discharge if you are awarding, and a standard you are held to
// if you are bidding.
//
// This file is the shape of the page. The CMS supplies the words for it, and
// the wording below is what the API serves back for a service nobody has
// written yet (see DEFAULT_SERVICES in be/src/modules/capabilities).
export const SERVICE_KEYS = [
  'procurement-strategy',
  'probity',
  'process-management',
  'evaluation-negotiation',
  'vendor-transition',
  'contract-management',
];

// `icon` names a mark in serviceIcons.jsx. `stage` is the label that makes the
// two segments read differently — the same service named for where it falls in
// a buyer's procurement or in a bidder's response.
//
// `order` is deliberately NOT per-segment, and used to be. The six ran in the
// order a procurement is run on Award and in the order a bidder meets them on
// Win, which is a defensible idea and a bad experience: the toggle is a
// re-labelling of the page you are already reading, and under it the rows
// physically reordered — Process Management jumped from third to second and
// everything below it shifted, so the section you had your eye on was somewhere
// else when the fade finished. One order for both, so the toggle changes the
// words and nothing moves.
export const SERVICES = [
  {
    key: 'procurement-strategy',
    title: 'Procurement Strategy',
    icon: 'target',
    order: 10,
    award: { stage: 'Before market' },
    win: { stage: 'Before the tender drops' },
  },
  {
    key: 'probity',
    title: 'Probity',
    icon: 'shield',
    order: 20,
    award: { stage: 'Throughout' },
    win: { stage: 'Throughout' },
  },
  {
    key: 'process-management',
    title: 'Process Management',
    icon: 'flow',
    order: 30,
    award: { stage: 'To market' },
    win: { stage: 'While the tender is open' },
  },
  {
    key: 'evaluation-negotiation',
    title: 'Evaluation & Negotiation',
    icon: 'scales',
    order: 40,
    award: { stage: 'Assessment' },
    win: { stage: 'Response and shortlist' },
  },
  {
    key: 'vendor-transition',
    title: 'Vendor Transition',
    icon: 'handover',
    order: 50,
    award: { stage: 'Award and handover' },
    win: { stage: 'Mobilisation' },
  },
  {
    key: 'contract-management',
    title: 'Contract Management',
    icon: 'document',
    order: 60,
    award: { stage: 'In life' },
    win: { stage: 'In life' },
  },
];

export const SERVICE_BY_KEY = Object.fromEntries(SERVICES.map((s) => [s.key, s]));

// Merges what the CMS holds onto the fixed set above and sorts it into the
// order that segment reads in. A card the CMS has nothing for still appears —
// the six are the page's structure, so one going missing because an editor
// hasn't written it yet would leave a hole rather than a shorter list.
export function resolveServices(saved, audience) {
  // Only the cards written for this side of the toggle, or for both.
  const forAudience = (saved || []).filter(
    (card) => !card.audience || card.audience === 'both' || card.audience === audience,
  );

  const byKey = new Map();
  const extras = [];
  for (const card of forAudience) {
    // Cards are matched on `key` where the CMS has one, and on title otherwise,
    // which is how the cards that predate the key field are picked up. Anything
    // that doesn't land on one of the six is a service an editor has *added*
    // for this segment, and is appended after them.
    const key = card.key || slugify(card.title);
    if (SERVICE_KEYS.includes(key)) byKey.set(key, card);
    else extras.push(card);
  }

  const six = SERVICES.map((service) => {
    const edited = byKey.get(service.key);
    const seg = service[audience] || service.award;
    return {
      key: service.key,
      title: edited?.title || service.title,
      body: edited?.body || '',
      icon: edited?.icon || service.icon,
      stage: edited?.stage || seg.stage,
      // The service's own order, not the segment's — see the note on SERVICES.
      order: service.order,
    };
  }).sort((a, b) => a.order - b.order);

  // Added services keep the CMS's own order among themselves and always follow
  // the six, whose order is fixed by the brief. The base is above the six's
  // highest order (60) so an editor can't accidentally interleave them.
  const added = extras
    .map((card, i) => ({
      key: card._id || card.key || slugify(card.title),
      title: card.title,
      body: card.body || '',
      icon: card.icon || 'target',
      stage: card.stage || '',
      order: 100 + (Number(card.order) || i),
    }))
    .sort((a, b) => a.order - b.order);

  return [...six, ...added];
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
