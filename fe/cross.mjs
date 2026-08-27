import { chromium, firefox, webkit } from 'playwright';
const base='http://localhost:5204', img=base+'/src/assets/images/HeroPoster.jpg';
const art=(i)=>({_id:'a'+i,slug:'a'+i,title:'Insight number '+(i+1),heroImage:{url:img},
  category:{_id:i<3?'c1':'c2',name:i<3?'Strategy':'Policy'},publishedAt:'2026-07-22T00:00:00.000Z',body:'<p>'+'word '.repeat(400)+'</p>'});
const cats=[{_id:'c1',id:'c1',name:'Strategy'},{_id:'c2',id:'c2',name:'Policy'}];
const q=(i)=>({_id:'q'+i,slug:'q'+i,title:'Question '+(i+1),category:'win',publishedAt:'2026-07-22T00:00:00.000Z',body:'Body',answer:'Ans'});
const engines = { chromium, firefox, webkit };
for (const [name, engine] of Object.entries(engines)) {
  let b;
  try { b = await engine.launch(); } catch (e) { console.log(name, 'LAUNCH FAILED', e.message.slice(0,80)); continue; }
  const p = await b.newPage({viewport:{width:1600,height:900}});
  await p.route('http://localhost:5000/api/**', r=>{ const u=r.request().url();
    const d = u.includes('/articles') ? [0,1,2,3,4,5].map(art) : u.includes('/categories') ? cats
      : /\/questions\/[^?]+/.test(u) ? q(0) : u.includes('/questions') ? [0,1,2].map(q) : [];
    return r.fulfill({json:{success:true,data:d}}); });
  const rec = async (label, ms, action) => {
    await p.evaluate(()=>{ window.__f=[]; let last=performance.now(); window.__stop=false;
      const tick=t=>{window.__f.push(t-last); last=t; if(!window.__stop) requestAnimationFrame(tick);}; requestAnimationFrame(tick); });
    await action(); await p.waitForTimeout(ms);
    const r = await p.evaluate(()=>{ window.__stop=true; const f=window.__f.slice(3).sort((a,b)=>a-b);
      if (!f.length) return null;
      return {n:f.length, med:+f[Math.floor(f.length/2)].toFixed(1), p95:+f[Math.floor(f.length*0.95)].toFixed(1),
        worst:+f[f.length-1].toFixed(1), janky:f.filter(x=>x>32).length}; });
    console.log(`  ${name.padEnd(9)} ${label.padEnd(26)} med ${String(r.med).padStart(5)}  p95 ${String(r.p95).padStart(6)}  worst ${String(r.worst).padStart(6)}  >32ms: ${r.janky}/${r.n}`);
  };
  const load = async (path) => { await p.goto(base+path,{waitUntil:'domcontentloaded'});
    await p.waitForSelector('.site-loader',{state:'detached',timeout:20000}).catch(()=>{}); await p.waitForTimeout(2000); };
  await load('/');
  const scale = await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--gp-scale').trim());
  console.log(`--- ${name} (page zoom scale: ${scale || 'unset'})`);
  await rec('homepage scroll', 3200, async()=>{ await p.evaluate(()=>{ const total=document.documentElement.scrollHeight-innerHeight;
    const t0=performance.now(); const step=()=>{ const k=(performance.now()-t0)/3000; scrollTo(0,Math.min(total,total*k)); if(k<1) requestAnimationFrame(step);}; requestAnimationFrame(step); }); });
  await rec('audience swap', 1400, async()=>{ await p.locator('.site-header__actions .audience-toggle__option',{hasText:'Award Contracts'}).first().click({force:true}).catch(()=>{}); });
  await load('/insights');
  await rec('insights filter swap', 1400, async()=>{ await p.locator('.insights-pill__button').first().click({force:true});
    await p.waitForTimeout(150); await p.locator('.insights-pill__option:not(.is-active)').first().click({force:true}).catch(()=>{}); });
  await rec('insights hover lift', 900, async()=>{ await p.locator('.insights-card__inner').first().hover().catch(()=>{}); });
  await load('/q-and-a/answers/q0');
  await rec('Q&A reveal (blur boxes)', 1600, async()=>{ await p.evaluate(()=>scrollTo(0,200)); });
  await b.close();
}
