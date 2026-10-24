const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const S = __dirname, REPO = require('path').resolve(S, '../..'), IMG = S + '/img';
const CDN_OK = process.env.CDN_OK === '1';
const geo = JSON.parse(fs.readFileSync(REPO + '/photo-map/korea-sgg-202610.json'));
function ctr(g){const r=g.type==='Polygon'?g.coordinates[0]:g.coordinates.reduce((a,p)=>p[0].length>a.length?p[0]:a,[]);let x=0,y=0;r.forEach(p=>{x+=p[0];y+=p[1]});return [x/r.length,y/r.length];}
let rnd=1;const R=()=>{rnd=(rnd*16807)%2147483647;return rnd/2147483647;};
const spots=[];geo.sgg.forEach((g,i)=>{const c=ctr(g.g);const n=1+Math.floor(R()*3);for(let j=0;j<n&&spots.length<431;j++)spots.push({id:String(spots.length+1),lat:c[1]+(R()-.5)*.06,lng:c[0]+(R()-.5)*.06,spot_main:'박지'+(spots.length+1),cityName:g.n});});
const feeds=[];for(let i=0;i<102;i++){const s=spots[Math.floor(R()*spots.length)];feeds.push({id:'f'+i,user_id:'u',spot_id:s.id,photos:['https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/feeds/p'+(i%12)+'_'+i+'.jpg'],likes_count:i%5,created_at:'2026-10-0'+(1+i%9)});}
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);let f=u==='/h.html'?S+'/harness.html':REPO+u;fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html'});r.end(d);});}).listen(0);
(async()=>{
  const port=srv.address().port;
  const b=await chromium.launch(process.env.GPU?{args:['--use-angle=metal','--enable-gpu-rasterization','--ignore-gpu-blocklist','--enable-gpu']}:{});const ctx=await b.newContext({viewport:{width:390,height:780},deviceScaleFactor:2});
  const pg=await ctx.newPage();
  let imgReq=0, imgBytes=0;
  await pg.route('https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/**',async rt=>{const m=rt.request().url().match(/p(\d+)_/);const d=fs.readFileSync(IMG+'/p'+m[1]+'.jpg');imgReq++;imgBytes+=d.length;await new Promise(r=>setTimeout(r,150));rt.fulfill({body:d,contentType:'image/jpeg',headers:{'access-control-allow-origin':'*'}});});
  await pg.route('https://img.romanticroute.kr/**',async rt=>{if(!CDN_OK){await new Promise(r=>setTimeout(r,300));return rt.abort();}const u=rt.request().url(),m=u.match(/p(\d+)_/),w=(u.match(/width=(\d+)/)||[])[1];const f=w&&fs.existsSync(IMG+'/p'+m[1]+'_w'+w+'.jpg')?IMG+'/p'+m[1]+'_w'+w+'.jpg':IMG+'/p'+m[1]+'.jpg';rt.fulfill({body:fs.readFileSync(f),contentType:'image/jpeg'});});
  await pg.addInitScript(({spots,feeds})=>{window.spots=spots;window.okbmPublicFetch=u=>new Promise(r=>setTimeout(()=>r(new Response(JSON.stringify(feeds))),400));},{spots,feeds});
  const cdp=await ctx.newCDPSession(pg);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await pg.goto(`http://localhost:${port}/h.html`);
  await pg.waitForFunction(()=>window.okbmPhotoMap);
  const t=await pg.evaluate(async()=>{const t0=performance.now();await window.okbmPhotoMap.open();return performance.now()-t0;});
  const dbg=()=>pg.evaluate(()=>{const d=okbmPhotoMap._debug();delete d.sggAt;delete d.spotAt;delete d.visibleSpot;return d;});
  console.log('open ms (4x cpu):',Math.round(t),await dbg());
  await pg.waitForTimeout(6000);
  await pg.screenshot({path:IMG+'/z1.png'});
  console.log('전국 화면', await dbg());
  async function frames(fn,arg){return pg.evaluate(async([src,arg])=>{const fr=[];let last=performance.now(),run=true;(function f(){const now=performance.now();fr.push(now-last);last=now;if(run)requestAnimationFrame(f)})();
    await (new Function('return ('+src+')')())(arg);run=false;fr.shift();fr.sort((a,b)=>a-b);return {frames:fr.length,median:Math.round(fr[fr.length>>1]),p90:Math.round(fr[Math.floor(fr.length*.9)]),max:Math.round(fr[fr.length-1])};},[fn.toString(),arg]);}
  await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
  // 사진 있는 시군구 칸을 눌러 박지 단계로 (600ms 전환)
  const tg=await pg.evaluate(()=>okbmPhotoMap._debug().sggAt.filter(o=>o.x>40&&o.x<350&&o.y>120&&o.y<700&&okbmPhotoMap._hit(o.x,o.y)===o.name).sort((a,b)=>b.w-a.w)[0]);
  console.log('누른 시군구',tg.name);
  await pg.evaluate(()=>{window.__pmTrace=[];window.__fr=[];let l=performance.now();(function f(){const n=performance.now();__fr.push([Math.round(n),Math.round(n-l)]);l=n;if(__fr.length<200)requestAnimationFrame(f)})();});
  console.log('시군구 클릭 확대 전환', await frames(async(tg)=>{document.querySelector('.pm-canvas').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:tg.x,clientY:tg.y}));await new Promise(r=>setTimeout(r,900));},tg));
  console.log('박지 단계', await dbg());
  if(process.env.TRACE) console.log(JSON.stringify(await pg.evaluate(()=>({tr:__pmTrace.slice(0,80),fr:__fr.filter(x=>x[1]>30)}))));
  console.log('박지에서 휠 확대', await frames(async()=>{const el=document.querySelector('.pm-canvas');for(let i=0;i<15;i++){el.dispatchEvent(new WheelEvent('wheel',{deltaY:-40,clientX:195,clientY:410,bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,16));}await new Promise(r=>setTimeout(r,300));}));
  console.log('박지에서 끌기', await frames(async()=>{const el=document.querySelector('.pm-canvas');const o={bubbles:true,cancelable:true,view:window};el.dispatchEvent(new MouseEvent('mousedown',{...o,clientX:200,clientY:400,button:0}));for(let i=1;i<=20;i++){window.dispatchEvent(new MouseEvent('mousemove',{...o,clientX:200-i*8,clientY:400-i*5}));await new Promise(r=>setTimeout(r,16));}window.dispatchEvent(new MouseEvent('mouseup',{...o,clientX:40,clientY:300}));await new Promise(r=>setTimeout(r,300));}));
  const prof=(await cdp.send('Profiler.stop')).profile;
  const self={};const dt=prof.timeDeltas;const idx={};prof.nodes.forEach(n=>idx[n.id]=n);
  prof.samples.forEach((id,i)=>{const n=idx[id];const f=n.callFrame;const key=(f.functionName||'(anon)')+' '+(f.url.split('/').pop()||'')+':'+(f.lineNumber+1);self[key]=(self[key]||0)+(dt[i]||0);});
  console.log(Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>Math.round(v/1000)+'ms '+k).join('\n'));
  await pg.waitForTimeout(4000); await pg.screenshot({path:IMG+'/z3.png'});
  console.log('보이는 박지 사진: 칸 크기(기기 px) vs 받은 사진 크기', JSON.stringify((await pg.evaluate(()=>okbmPhotoMap._debug().visibleSpot)).slice(0,6)));
  console.log('img requests',imgReq,'bytes',(imgBytes/1e6).toFixed(1)+'MB');
  await b.close();srv.close();
})();
