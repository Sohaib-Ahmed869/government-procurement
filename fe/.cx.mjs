import { chromium } from 'playwright';
import { execSync } from 'child_process';
const OUT = process.env.SHOT_DIR;
const token = execSync('node -e "' + [
  "import('mongoose').then(async m=>{",
  "const {env}=await import('./src/config/env.js');",
  "const {User}=await import('./src/models/User.js');",
  "const {Enrollment}=await import('./src/models/Enrollment.js');",
  "const {signAuthToken}=await import('./src/utils/token.js');",
  "await m.default.connect(env.mongoUri);",
  "const e=await Enrollment.findOne({revokedAt:null}).lean();",
  "const u=await User.findById(e.user).lean();",
  "console.log(signAuthToken({sub:u._id,role:u.role}));",
  "await m.default.disconnect();});",
].join('') + '"', { cwd: '../be' }).toString().trim();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0,180)));
await page.goto('http://localhost:5299/learn/login', { waitUntil: 'domcontentloaded' });
await page.evaluate((t) => localStorage.setItem('gp.learn.token', t), token);

for (const [name, url] of [['catalog','/learn/courses'], ['mine','/learn/my-courses'], ['paths','/learn/paths']]) {
  await page.goto('http://localhost:5299' + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3400);
  const r = await page.evaluate(() => {
    const card = document.querySelector('.lms-course');
    if (!card) return { cards: 0 };
    const cover = card.querySelector('.lms-course__cover');
    const cs = cover ? getComputedStyle(cover) : null;
    const sh = getComputedStyle(card).boxShadow;
    return {
      cards: document.querySelectorAll('.lms-course').length,
      coverBg: cs ? (cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0,40) : cs.backgroundColor) : null,
      coverH: cover ? Math.round(cover.getBoundingClientRect().height) : null,
      cardH: Math.round(card.getBoundingClientRect().height),
      raised: sh.includes('inset') && (sh.match(/rgba?\(/g) || []).length >= 4,
      // Any dark-green block left anywhere on the page?
      darkBlocks: [...document.querySelectorAll('*')].filter(e => {
        const g = getComputedStyle(e);
        return /rgb\(10, 49, 20\)|#0a3114/.test(g.backgroundImage + g.backgroundColor)
          && e.getBoundingClientRect().height > 40;
      }).map(e => (e.className || e.tagName).toString().slice(0, 34)),
      hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  console.log(name.padEnd(9), JSON.stringify(r));
  await page.screenshot({ path: `${OUT}/w-${name}.png` });
}
await browser.close();
