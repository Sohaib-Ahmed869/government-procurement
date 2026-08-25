/* The lockup is a vertical stack, so viewport HEIGHT is what constrains it.
   These cases lead with the wide-but-short screens that overflow first. */
import { chromium } from 'playwright';

const SIZES = [
  ['laptop      1440x900 ', 1440, 900],
  ['small wide  1600x800 ', 1600, 800],
  ['desktop     1680x1050', 1680, 1050],
  ['1080p       1920x1080', 1920, 1080],
  ['ultrawide   2560x1080', 2560, 1080],
  ['1440p       2560x1440', 2560, 1440],
  ['ultrawide   3440x1440', 3440, 1440],
  ['4K native   3840x2160', 3840, 2160],
];

const browser = await chromium.launch();
console.log('screen                 sl    mark   logo   word  stack-h  vh    headroom');
let worst = Infinity;
for (const [label, width, height] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5188/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.site-loader__bar', { timeout: 8000 });
  await page.waitForTimeout(300);

  const m = await page.evaluate(() => {
    const root = document.querySelector('.site-loader');
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const mark = r('.site-loader__mark');
    const bar = r('.site-loader__bar');
    return {
      sl: getComputedStyle(root).getPropertyValue('--sl').trim(),
      mark: Math.round(mark.width),
      logo: Math.round(parseFloat(getComputedStyle(document.querySelector('.site-loader__logo')).width)),
      word: Math.round(parseFloat(getComputedStyle(document.querySelector('.site-loader__wordmark')).fontSize)),
      top: mark.top,
      bottom: bar.bottom,
    };
  });

  const stack = Math.round(m.bottom - m.top);
  const headroom = Math.round(Math.min(m.top, height - m.bottom));
  worst = Math.min(worst, headroom);
  console.log(
    `${label}  ${m.sl.padEnd(5)} ${String(m.mark).padStart(4)}px ${String(m.logo).padStart(4)}px ${String(m.word).padStart(3)}px ${String(stack).padStart(6)}px ${String(height).padStart(5)} ${String(headroom).padStart(6)}px ${headroom < 40 ? '  <-- TIGHT' : ''}`,
  );
  await ctx.close();
}
await browser.close();
console.log(`\nsmallest headroom above/below the stack: ${worst}px`);
