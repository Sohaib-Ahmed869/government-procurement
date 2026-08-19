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

// `icon` names a mark in serviceIcons.jsx. `stage` is what makes the two
// segments structurally different rather than only relabelled: on Award the six
// run in the order a procurement is actually run, and on Win they run in the
// order a bidder meets them. Same six services, two different journeys.
export const SERVICES = [
  {
    key: 'procurement-strategy',
    title: 'Procurement Strategy',
    icon: 'target',
    award: { stage: 'Before market', order: 10 },
    win: { stage: 'Before the tender drops', order: 10 },
  },
  {
    key: 'probity',
    title: 'Probity',
    icon: 'shield',
    award: { stage: 'Throughout', order: 20 },
    win: { stage: 'Throughout', order: 50 },
  },
  {
    key: 'process-management',
    title: 'Process Management',
    icon: 'flow',
    award: { stage: 'To market', order: 30 },
    win: { stage: 'While the tender is open', order: 20 },
  },
  {
    key: 'evaluation-negotiation',
    title: 'Evaluation & Negotiation',
    icon: 'scales',
    award: { stage: 'Assessment', order: 40 },
    win: { stage: 'Response and shortlist', order: 30 },
  },
  {
    key: 'vendor-transition',
    title: 'Vendor Transition',
    icon: 'handover',
    award: { stage: 'Award and handover', order: 50 },
    win: { stage: 'Mobilisation', order: 40 },
  },
  {
    key: 'contract-management',
    title: 'Contract Management',
    icon: 'document',
    award: { stage: 'In life', order: 60 },
    win: { stage: 'In life', order: 60 },
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
      // Empty unless an editor has uploaded one; ServiceRows falls back to the
      // built-in photograph named for this service.
      image: edited?.image?.url || '',
      order: seg.order,
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
      image: card.image?.url || '',
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
