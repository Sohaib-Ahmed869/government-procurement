// The marks a Service Offering card can carry. A fixed set rather than an
// upload, so every card is drawn in the same style — the CMS offers these by
// label, and `key` is what the API stores (see CAPABILITY_ICONS in the backend
// model, which must list the same keys).
//
// Drawn as inline SVG rather than as image files. Three things follow from
// that: they inherit `currentColor`, so a card's mark changes with the win /
// award ramp instead of staying a fixed-colour PNG; the set can grow to cover
// the six services (A5) without six new binaries in the repo; and they stay
// crisp at any density. `target`, `document` and `graph` keep their original
// keys, so every card saved before this change still resolves.
const PATHS = {
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  graph: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="m7.5 15 3.5-4.5 3 2.5L20 7" />
      <path d="M20 7h-3.5M20 7v3.5" />
    </>
  ),
  // Probity — a shield with a tick. The one card where the mark has to read as
  // "checked and defensible" rather than as "done".
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  // Process management — stages on a track.
  flow: (
    <>
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="19" cy="12" r="2.2" />
      <path d="M7.2 12h2.6M14.2 12h2.6" />
    </>
  ),
  // Evaluation and negotiation — a balance.
  scales: (
    <>
      <path d="M12 4v16M7 20h10" />
      <path d="M12 7 5 9M12 7l7 2" />
      <path d="M2.5 15a2.5 2.5 0 0 0 5 0L5 9zM16.5 15a2.5 2.5 0 0 0 5 0L19 9z" />
    </>
  ),
  // Vendor transition — a handover between two parties.
  handover: (
    <>
      <path d="M3 9h5l2.5 2.5" />
      <path d="M21 9h-5l-2.5 2.5" />
      <path d="M8.5 14.5 12 18l3.5-3.5" />
      <path d="M12 18V9.5" />
    </>
  ),
};

export const CAPABILITY_ICONS = [
  { key: 'target', label: 'Target' },
  { key: 'document', label: 'Document' },
  { key: 'graph', label: 'Graph' },
  { key: 'shield', label: 'Shield' },
  { key: 'flow', label: 'Process' },
  { key: 'scales', label: 'Scales' },
  { key: 'handover', label: 'Handover' },
];

export const CAPABILITY_ICON_BY_KEY = Object.fromEntries(
  CAPABILITY_ICONS.map((i) => [i.key, i]),
);

// Renders one of the marks above. An unknown key falls back to `target` rather
// than to nothing, so a card saved against a key that has since been removed
// still draws something.
export function CapabilityIcon({ name, size = 26, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.target}
    </svg>
  );
}

// The cards themselves live in the CMS (Service Offering), seeded by
// `npm run seed:capabilities`. This file used to carry a FALLBACK_CAPABILITIES
// copy of them, which the page rendered on every mount while the request was
// still out — so an edited card visibly flashed the shipped wording before the
// saved one arrived. Only the icon set is built in, since a card names one of
// these by key rather than storing artwork of its own.
