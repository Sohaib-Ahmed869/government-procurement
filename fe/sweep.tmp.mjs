import { chromium } from 'playwright';
const b = await chromium.launch();
const PAGES = ['/', '/capabilities', '/our-team', '/our-team/mohammed-kheir', '/courses', '/insights',
  '/insights/governance-probity-fair-tendering', '/q-and-a', '/tender-portals', '/careers',
  '/jurisdictional-links', '/book-a-consultation', '/privacy', '/terms'];

for (const [w, label] of [[1440, 'desktop'], [390, 'mobile']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  let bad = [];
  for (const url of PAGES) {
    await p.goto(`http://localhost:5173${url}?audience=award`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const hits = await p.evaluate(async () => {
      await document.fonts.ready;
      const seen = new Set();
      document.querySelectorAll('body *').forEach((el) => {
        if (!el.textContent || !el.textContent.trim()) return;
        const f = getComputedStyle(el).fontFamily;
        if (/Segoe/i.test(f)) seen.add(el.className || el.tagName);
      });
      return [...seen].slice(0, 4);
    });
    if (hits.length) bad.push(`${url}: ${hits.join(', ')}`);
  }
  console.log(`${label} (${w}px): ${bad.length ? 'STILL SEGOE -> ' + bad.join(' | ') : 'no element resolves to Segoe UI'}`);
  await p.close();
}
await b.close();
