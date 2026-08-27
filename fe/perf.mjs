import { chromium } from 'playwright';
const base='http://localhost:5204', img=base+'/src/assets/images/HeroPoster.jpg';
const RATE = Number(process.argv[2] || 6);
const WIDTH = Number(process.argv[3] || 1600);

const art=(i)=>({_id:'a'+i,slug:'a'+i,title:'Insight number '+(i+1),heroImage:{url:img},
  category:{_id:i<3?'c1':'c2',name:i<3?'Strategy':'Policy'},publishedAt:'2026-07-22T00:00:00.000Z',
  body:'<p>'+'word '.repeat(400)+'</p>'});
const cats=[{_id:'c1',id:'c1',name:'Strategy'},{_id:'c2',id:'c2',name:'Policy'}];
const q=(i)=>({_id:'q'+i,slug:'q'+i,title:'Question '+(i+1),category:'win',publishedAt:'2026-07-22T00:00:00.000Z',
  body:'A supplier submits the lowest bid but the panel finds compliance gaps.',answer:'The panel applies the criteria.'});
const site=(i,g)=>({_id:'t'+i+g,name:'Portal '+(i+1),subtitle:'Sub',group:g,openTendersUrl:'https://e.com'});

const b=await chromium.launch();
const p=await b.newPage({viewport:{width:WIDTH,height:900}});
const cdp = await p.context().newCDPSession(p);
await p.route('http://localhost:5000/api/**', r=>{ const u=r.request().url(); let d=[];
  if(u.includes('/articles')) d=[0,1,2,3,4,5].map(art);
  else if(u.includes('/categories')) d=cats;
  else if(/\/questions\/[^?]+/.test(u)) d=q(0); else if(u.includes('/questions')) d=[0,1,2].map(q);
  else if(u.includes('tender-sites')) d=[site(0,'australian'),site(1,'local'),site(2,'other')];
  return r.fulfill({json:{success:true,data:d}}); });

// Records frame intervals while `action` runs.
const record = async (label, ms, action) => {
  await p.evaluate(()=>{ window.__f=[]; let last=performance.now();
    window.__stop=false;
    const tick=(t)=>{ window.__f.push(t-last); last=t; if(!window.__stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
  await action();
  await p.waitForTimeout(ms);
  const r = await p.evaluate(()=>{ window.__stop=true; const f=window.__f.slice(3).sort((a,b)=>a-b);
    if(!f.length) return null;
    return { n:f.length, med:+f[Math.floor(f.length/2)].toFixed(1), p95:+f[Math.floor(f.length*0.95)].toFixed(1),
      worst:+f[f.length-1].toFixed(1), janky:f.filter(x=>x>32).length }; });
  console.log(`  ${label.padEnd(34)} med ${String(r.med).padStart(5)}ms  p95 ${String(r.p95).padStart(6)}ms  worst ${String(r.worst).padStart(6)}ms  frames>32ms: ${r.janky}/${r.n}`);
};

const load = async (path) => {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await p.goto(base+path, {waitUntil:'domcontentloaded'});
  await p.waitForSelector('.site-loader',{state:'detached',timeout:15000}).catch(()=>{});
  await p.waitForTimeout(1800);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
};

console.log(`\n=== CPU throttle ${RATE}x, viewport ${WIDTH}px ===`);

// 1. scroll reveals, homepage
await load('/');
await record('homepage scroll (reveals)', 3200, async () => {
  await p.evaluate(()=>{ const total=document.documentElement.scrollHeight-innerHeight; const t0=performance.now();
    const step=()=>{ const k=(performance.now()-t0)/3000; scrollTo(0, Math.min(total,total*k)); if(k<1) requestAnimationFrame(step); };
    requestAnimationFrame(step); });
});

// 2. audience swap on the homepage
await record('homepage audience swap', 1400, async () => {
  await p.locator('.site-header__actions .audience-toggle__option', {hasText:'Award Contracts'}).first().click({force:true}).catch(()=>{});
});

// 3. Q&A answer page — reveal of boxes that carry backdrop-filter
await load('/q-and-a/answers/q0');
await record('Q&A answer reveal (blurred boxes)', 1600, async () => {
  await p.evaluate(()=>scrollTo(0, 200));
});

// 4. Insights filter swap
await load('/insights');
await record('insights filter swap', 1400, async () => {
  await p.locator('.insights-pill__button').first().click({force:true});
  await p.waitForTimeout(150);
  await p.locator('.insights-pill__option:not(.is-active)').first().click({force:true});
});

// 5. insights card hover (the composited lift)
await record('insights card hover lift', 900, async () => {
  await p.locator('.insights-card__inner').first().hover().catch(()=>{});
});

// 6. tender page scroll reveals
await load('/tender-portals');
await record('tender page scroll (reveals)', 2600, async () => {
  await p.evaluate(()=>{ const total=document.documentElement.scrollHeight-innerHeight; const t0=performance.now();
    const step=()=>{ const k=(performance.now()-t0)/2400; scrollTo(0, Math.min(total,total*k)); if(k<1) requestAnimationFrame(step); };
    requestAnimationFrame(step); });
});
await b.close();
