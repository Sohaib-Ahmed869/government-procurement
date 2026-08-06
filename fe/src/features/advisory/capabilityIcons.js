import targetIcon from '../../assets/icons/Target.png';
import docsIcon from '../../assets/icons/Google Docs.png';
import graphIcon from '../../assets/icons/Auto graph.png';

// The marks a capability card can carry. A fixed set rather than an upload, so
// every card is drawn in the same style — the CMS offers these by label, and
// `key` is what the API stores (see CAPABILITY_ICONS in the backend model).
export const CAPABILITY_ICONS = [
  { key: 'target', label: 'Target', src: targetIcon },
  { key: 'document', label: 'Document', src: docsIcon },
  { key: 'graph', label: 'Graph', src: graphIcon },
];

export const CAPABILITY_ICON_BY_KEY = Object.fromEntries(
  CAPABILITY_ICONS.map((i) => [i.key, i]),
);

// The cards themselves live in the CMS (Capabilities), seeded by
// `npm run seed:capabilities`. This file used to carry a FALLBACK_CAPABILITIES
// copy of them, which the page rendered on every mount while the request was
// still out — so an edited card visibly flashed the shipped wording before the
// saved one arrived. Only the icon set is built in, since a card names one of
// these by key rather than storing artwork of its own.
