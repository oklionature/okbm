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
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:780},deviceScaleFactor:2});
  const pg=await ctx.newPage();
  let imgReq=0, imgBytes=0;
  await pg.route('https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/**',async rt=>{const m=rt.request().url().match(/p(\d+)_/);const d=fs.readFileSync(IMG+'/p'+m[1]+'.jpg');imgReq++;imgBytes+=d.length;await new Promise(r=>setTimeout(r,150));rt.fulfill({body:d,contentType:'image/jpeg',headers:{'access-control-allow-origin':'*'}});});
  await pg.route('https://img.romanticroute.kr/**',async rt=>{if(!CDN_OK){await new Promise(r=>setTimeout(r,300));return rt.abort();}const u=rt.request().url(),m=u.match(/p(\d+)_/),w=(u.match(/width=(\d+)/)||[])[1];const f=w&&fs.existsSync(IMG+'/p'+m[1]+'_w'+w+'.jpg')?IMG+'/p'+m[1]+'_w'+w+'.jpg':IMG+'/p'+m[1]+'.jpg';rt.fulfill({body:fs.readFileSync(f),contentType:'image/jpeg'});});
  await pg.addInitScript(({spots,feeds})=>{window.spots=spots;window.okbmPublicFetch=u=>new Promise(r=>setTimeout(()=>r(new Response(JSON.stringify(feeds))),400));},{spots,feeds});
  const cdp=await ctx.newCDPSession(pg);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await pg.goto(`http://localhost:${port}/h.html`);
  await pg.waitForFunction(()=>window.okbmPhotoMap);
  const t=await pg.evaluate(async()=>{const t0=performance.now();await window.okbmPhotoMap.open();return performance.now()-t0;});
  const nodes=await pg.evaluate(()=>({all:document.querySelectorAll('.pm-svg *').length,clip:document.querySelectorAll('clipPath').length,img:document.querySelectorAll('image.pm-img').length}));
  console.log('open ms (4x cpu):',Math.round(t),nodes);
  await pg.waitForTimeout(6000);
  await pg.screenshot({path:IMG+'/z1.png'});
  console.log('전국 화면 사진 들어간 칸', await pg.evaluate(()=>document.querySelectorAll('image.pm-in').length));
  async function frames(fn){return pg.evaluate(async(src)=>{const fr=[];let last=performance.now(),run=true;(function f(){const now=performance.now();fr.push(now-last);last=now;if(run)requestAnimationFrame(f)})();
    await (new Function('return ('+src+')()'))();run=false;fr.shift();fr.sort((a,b)=>a-b);return {frames:fr.length,median:Math.round(fr[fr.length>>1]),p90:Math.round(fr[Math.floor(fr.length*.9)]),max:Math.round(fr[fr.length-1])};},fn.toString());}
  await pg.evaluate(()=>{const o=d3.geoContains;window.__gc={n:0,ms:0};d3.geoContains=function(a,b){const t=performance.now();const r=o(a,b);__gc.n++;__gc.ms+=performance.now()-t;return r;};});
  await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
  // 사진 있는 시군구 칸을 눌러 박지 단계로 (600ms 전환)
  console.log('시군구 클릭 확대 전환', await frames(async()=>{const im=[...document.querySelectorAll('image.pm-sggimg.pm-in')];const g=im[Math.floor(im.length/2)].parentNode;g.querySelector('.pm-region').dispatchEvent(new MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,900));}));
  console.log('k=',await pg.evaluate(()=>d3.zoomTransform(document.querySelector('.pm-stage')).k));
  console.log('박지에서 휠 확대', await frames(async()=>{const el=document.querySelector('.pm-svg');for(let i=0;i<15;i++){el.dispatchEvent(new WheelEvent('wheel',{deltaY:-40,clientX:195,clientY:410,bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,16));}await new Promise(r=>setTimeout(r,300));}));
  console.log('geoContains 호출', await pg.evaluate(()=>({n:__gc.n,ms:Math.round(__gc.ms)})));
  const prof=(await cdp.send('Profiler.stop')).profile;
  const self={};const dt=prof.timeDeltas;const idx={};prof.nodes.forEach(n=>idx[n.id]=n);
  prof.samples.forEach((id,i)=>{const n=idx[id];const f=n.callFrame;const key=(f.functionName||'(anon)')+' '+(f.url.split('/').pop()||'')+':'+(f.lineNumber+1);self[key]=(self[key]||0)+(dt[i]||0);});
  console.log(Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,18).map(([k,v])=>Math.round(v/1000)+'ms '+k).join('\n'));
  console.log('k=',await pg.evaluate(()=>d3.zoomTransform(document.querySelector('.pm-stage')).k));
  await pg.waitForTimeout(4000); await pg.screenshot({path:IMG+'/z3.png'});
  const info=await pg.evaluate(()=>{const dpr=devicePixelRatio;return Promise.all([...document.querySelectorAll('.pm-l-spot image.pm-in')].filter(e=>{const r=e.getBoundingClientRect();return r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;}).map(e=>new Promise(ok=>{const i=new Image();i.onload=()=>{const r=e.getBoundingClientRect();ok({cellPx:Math.round(Math.max(r.width,r.height)*dpr),imgPx:Math.max(i.naturalWidth,i.naturalHeight)})};i.src=e.getAttribute('href');})))});
  console.log('보이는 박지 사진: 칸 크기(기기 px) vs 받은 사진 크기', info);
  console.log('img requests',imgReq,'bytes',(imgBytes/1e6).toFixed(1)+'MB');
  await b.close();srv.close();
})();
