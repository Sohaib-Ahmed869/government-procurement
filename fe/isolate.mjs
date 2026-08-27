import { chromium } from 'playwright';
const base='http://localhost:5204', img=base+'/src/assets/images/HeroPoster.jpg';
const mk=(withImg)=>(i)=>({_id:'a'+i,slug:'a'+i,title:'Insight number '+(i+1),
  heroImage: withImg?{url:img}:null, category:{_id:i<3?'c1':'c2',name:i<3?'Strategy':'Policy'},
  publishedAt:'2026-07-22T00:00:00.000Z', body:'<p>'+'word '.repeat(400)+'</p>'});
const cats=[{_id:'c1',id:'c1',name:'Strategy'},{_id:'c2',id:'c2',name:'Policy'}];
const b=await chromium.launch();
for (const withImg of [true,false]) {
  const p=await b.newPage({viewport:{width:1600,height:900}});
  const cdp=await p.context().newCDPSession(p);
  await p.route('http://localhost:5000/api/**', r=>{ const u=r.request().url();
    const d = u.includes('/articles') ? [0,1,2,3,4,5].map(mk(withImg)) : u.includes('/categories') ? cats : [];
    return r.fulfill({json:{success:true,data:d}}); });
  await p.goto(base+'/insights',{waitUntil:'domcontentloaded'});
  await p.waitForSelector('.site-loader',{state:'detached',timeout:15000}).catch(()=>{});
  await p.waitForTimeout(1800);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
  await p.evaluate(()=>{ window.__f=[]; let last=performance.now(); window.__stop=false;
    const tick=t=>{window.__f.push(t-last); last=t; if(!window.__stop) requestAnimationFrame(tick);}; requestAnimationFrame(tick); });
  await p.locator('.insights-pill__button').first().click({force:true});
  await p.waitForTimeout(150);
  await p.locator('.insights-pill__option:not(.is-active)').first().click({force:true});
  await p.waitForTimeout(1400);
  const r=await p.evaluate(()=>{ window.__stop=true; const f=window.__f.slice(3).sort((a,b)=>a-b);
    return {n:f.length, p95:+f[Math.floor(f.length*0.95)].toFixed(1), worst:+f[f.length-1].toFixed(1), janky:f.filter(x=>x>32).length}; });
  console.log(withImg?'with images   ':'without images', JSON.stringify(r));
  await p.close();
}
await b.close();
