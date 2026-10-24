const pw=require('playwright'),fs=require('fs'); const R=require('path').resolve(__dirname,'../..')+'/'; const MINE=process.env.MINE==='1', OUT=process.argv[2];
(async()=>{
 const b=await pw.chromium.launch({args:['--use-angle=metal','--enable-gpu']}); const pg=await (await b.newContext({...pw.devices['iPhone 13']})).newPage();
 pg.on('pageerror',e=>console.log('ERR',e.message));
 await pg.route(/romanticroute\.kr\/photo-map\.js/, rt=>{let src=fs.readFileSync(R+'photo-map.js','utf8'); if(MINE) src=src.replace("mode = hasMine ? 'mine' : 'all';","mode = 'mine';"); rt.fulfill({body:src,contentType:'text/javascript'});});
 await pg.goto('https://romanticroute.kr/map.html',{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(2500);
 if(!/map\.html/.test(pg.url())) await pg.goto('https://romanticroute.kr/map.html',{waitUntil:'domcontentloaded'});
 await pg.waitForFunction(()=>Array.isArray(window.spots)&&window.spots.length>100,null,{timeout:30000}); await pg.waitForTimeout(3000);
 if(MINE) await pg.evaluate(()=>{const ss=window.spots.filter((s,i)=>i%6==0); window.userVisited=new Set(ss.map(s=>String(s.id).trim()));});
 await pg.evaluate(()=>window.okbmPhotoMap.open({minLat:33,maxLat:38.7,minLng:125,maxLng:130})); await pg.waitForTimeout(3000);
 for (const st of ['a','b','c']) {
   const data=await pg.evaluate(async(st)=>{const c=await okbmPhotoMap.exportImage({bg:'sky',style:st});return c.toDataURL('image/jpeg',0.9);},st);
   fs.writeFileSync(OUT+'/'+(MINE?'mine':'all')+'-'+st+'.jpg', Buffer.from(data.split(',')[1],'base64'));
 }
 await b.close();
})();
