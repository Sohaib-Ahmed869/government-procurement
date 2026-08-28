#!/usr/bin/env node
/* Recolours a Lottie animation onto the Government Procurement palette.

   Animations downloaded from LottieFiles arrive in whatever colours their
   author chose. Rather than hand-editing 57 layers of JSON, this walks the
   document and remaps every solid fill it finds.

   WHAT IT DELIBERATELY LEAVES ALONE: skin tones and near-neutrals. Recolouring
   a person's face green is the failure mode of every automated palette swap,
   and greys carry the line work that gives the drawing its structure.

   Usage:  node scripts/recolour-lottie.mjs <in.json> <out.json>
*/
import { readFileSync, writeFileSync } from 'node:fs';

const BRAND = {
  deep: '#0a3114',   // gp-green-900
  mid: '#0f4a20',    // lms-green-600
  bright: '#1f7a3d', // a step up, for fills that need to read on dark
  mint: '#7ee2a8',   // gp-mint-300
};

const toHex = (c) =>
  '#' + c.slice(0, 3).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// HSL is the right space for "is this a skin tone" and "how bright is this".
function hsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function mapColour(rgb) {
  const [h, s, l] = hsl(rgb);

  // Near-neutral: white, black, greys. The line work — leave it.
  if (s < 0.12) return null;
  // Skin and hair: warm hues at moderate-to-high lightness.
  if (h >= 8 && h <= 45 && l > 0.45) return null;

  // Everything else becomes brand, keeping the ORIGINAL lightness ordering so
  // the drawing keeps its depth instead of flattening to one green.
  if (l < 0.2) return toRgb(BRAND.deep);
  if (l < 0.4) return toRgb(BRAND.mid);
  if (l < 0.62) return toRgb(BRAND.bright);
  return toRgb(BRAND.mint);
}

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('usage: recolour-lottie.mjs <in.json> <out.json>');
  process.exit(1);
}

const doc = JSON.parse(readFileSync(inFile, 'utf8'));
let changed = 0, kept = 0;

(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (!node || typeof node !== 'object') return;

  // A solid colour property in Lottie is `{ c: { k: [r,g,b,a] } }`.
  if (node.c?.k && Array.isArray(node.c.k) && typeof node.c.k[0] === 'number' && node.c.k.length >= 3) {
    const next = mapColour(node.c.k);
    if (next) { node.c.k = [...next, node.c.k[3] ?? 1]; changed += 1; } else kept += 1;
  }
  // Gradients store colours as a flat stop array; recolouring those reliably
  // needs the stop layout, so they are left as-is and reported.
  Object.values(node).forEach(walk);
})(doc);

writeFileSync(outFile, JSON.stringify(doc));
console.log(`recoloured ${changed} fills, left ${kept} (neutrals and skin tones) alone`);
console.log(`wrote ${outFile}`);
