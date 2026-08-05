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

// Cards shipped with the page, shown until the CMS holds any of its own — so the
// section is never empty, including before a single card has been added.
export const FALLBACK_CAPABILITIES = [
  {
    icon: 'target',
    title: 'Strategy Development',
    body: "We craft comprehensive bid strategies that not only showcase your organisation's unique strengths, but also align seamlessly with buyer expectations.",
  },
  {
    icon: 'document',
    title: 'Tender Design & Documentation',
    body: 'Building persuasive proposals, pricing models, and supporting documentation that address requirements clearly and convincingly.',
  },
  {
    icon: 'graph',
    title: 'Evaluation & Assessment',
    body: 'Structuring responses to meet evaluation criteria and demonstrate measurable value, ensuring your bid stands out.',
  },
];
