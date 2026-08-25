// The services on the Service Offering page — all of them, from the CMS.
//
// There used to be a fixed six here: their names, icons, per-segment stage
// labels and running order, written into this file because the brief fixed the
// set. A card in the CMS then named one of the six through a `key` field and
// supplied its copy, and anything that didn't match one of the six was appended
// after them as an "added" service.
//
// That stopped being true the moment the two segments needed different services
// in different numbers — Win has its own list, Award has another and longer one,
// and neither is six. A fixed set cannot describe that, and the `key` dropdown
// that went with it was asking an editor which of six a card was when the answer
// was "none of them".
//
// So there is no set. Every service on the page is a CMS card, under whichever
// segment it was written for, in the order the CMS gives it. Nothing about the
// page's contents lives in this file any more, which is the point: adding a
// service to Award is now a card, not a deploy.
//
// This file is the resolver and nothing else.

// Picks the cards written for `audience` and puts them in order.
//
// A card marked 'both' serves each segment — that is how a service whose wording
// does not change between them is written once rather than twice. A card saved
// before the audience field existed has none, and is treated as 'both'.
//
// Sorted by the CMS's Order, lowest first, with the list's own order breaking
// ties so two services left on the default 0 keep the order they were created
// in rather than swapping about between renders.
export function resolveServices(saved, audience) {
  return (saved || [])
    .filter(
      (card) => !card.audience || card.audience === 'both' || card.audience === audience,
    )
    .map((card, index) => ({
      // Identifies the row in React and in the consultation link. The document
      // id where there is one, so two services that happen to share a title
      // still get separate keys; the slug is the fallback for a card that has
      // not been saved yet.
      key: card._id || card.id || slugify(card.title),
      title: card.title || '',
      body: card.body || '',
      // The model defaults this, but a card can still arrive without it from an
      // older document.
      icon: card.icon || 'target',
      stage: card.stage || '',
      order: Number(card.order) || 0,
      index,
    }))
    .sort((a, b) => a.order - b.order || a.index - b.index);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
