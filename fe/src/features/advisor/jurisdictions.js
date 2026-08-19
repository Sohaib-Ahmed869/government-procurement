import { rulePacksApi } from '../../api';

// A6 — the jurisdictions the advisor offers, and how a rule pack is assembled.
//
// Only the ones that actually run are listed. The picker fills the rest of the
// row with unnamed "Coming soon" boxes: naming a jurisdiction there would be a
// commitment to which one is next, which nobody has made. Adding one is ship
// its pack under rules/, add it here, and the placeholder count drops by one.
export const JURISDICTIONS = [
  {
    slug: 'nsw',
    code: 'NSW',
    name: 'New South Wales',
    note: 'Available now',
  },
];

// How many boxes the row holds in total, so the picker keeps its shape as
// jurisdictions are added.
export const PICKER_SLOTS = 3;

// The built-in packs. Imported lazily: the NSW pack is a thousand lines of
// rules and sources, and nobody who doesn't open the advisor should pay for it.
const BUILT_IN = {
  nsw: () => import('./rules/nsw.js').then((m) => m.default),
};

// A6.7 — the CMS half.
//
// The decision logic (which question follows which, how a pathway is ranked)
// lives in the pack as code and is not editable from a web form: an admin
// screen that could redefine control flow is a code editor with none of the
// safeguards. What *does* change when policy moves is the numbers and the
// wording — a threshold, a source's title or URL, the "as at" date — and the
// rule pack's own header says as much: edit THRESHOLDS, update `asAt`, bump the
// version.
//
// So that is what the CMS holds: a versioned overlay of thresholds and source
// metadata per jurisdiction, merged over the built-in pack here. Publishing a
// new version changes the tool without a deploy; the shape of the questions
// stays under review in code where it belongs.
function applyOverrides(pack, overlay) {
  if (!overlay) return pack;

  const merged = { ...pack };

  if (overlay.thresholds && typeof overlay.thresholds === 'object') {
    // Only keys the pack already defines. An overlay cannot invent a threshold
    // the engine never reads, which would look like it had taken effect.
    const next = { ...pack.thresholds };
    for (const [k, v] of Object.entries(overlay.thresholds)) {
      if (k in next && typeof v === 'number' && Number.isFinite(v)) next[k] = v;
    }
    merged.thresholds = next;
  }

  if (overlay.sources && typeof overlay.sources === 'object') {
    const next = { ...pack.sources };
    for (const [k, v] of Object.entries(overlay.sources)) {
      if (!next[k] || !v || typeof v !== 'object') continue;
      // Title, note, url and asAt only — the quotes a finding cites are part of
      // the pack's evidence and are not editable from here.
      const { title, note, url, asAt } = v;
      next[k] = {
        ...next[k],
        ...(title ? { title } : null),
        ...(note ? { note } : null),
        ...(url ? { url } : null),
        ...(asAt ? { asAt } : null),
      };
    }
    merged.sources = next;
  }

  if (overlay.version) merged.version = overlay.version;
  if (overlay.asAt) merged.asAt = overlay.asAt;

  return merged;
}

// Returns the pack the tool should run, or null if the jurisdiction has none.
// A failed or missing overlay is not an error: the built-in pack is complete on
// its own, and a CMS outage must not take the advisor down.
export async function getRulePack(slug) {
  const load = BUILT_IN[slug];
  if (!load) return null;

  const pack = await load();

  let overlay = null;
  try {
    overlay = await rulePacksApi.active(slug);
  } catch {
    /* built-in pack stands */
  }

  return applyOverrides(pack, overlay);
}
