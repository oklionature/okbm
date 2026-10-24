const pw=require('playwright'),fs=require('fs'); const R=require('path').resolve(__dirname,'../..')+'/';
(async()=>{
 const b=await pw.chromium.launch({args:['--use-angle=metal','--enable-gpu']}); const pg=await (await b.newContext({...pw.devices['iPhone 13']})).newPage();
 pg.on('pageerror',e=>console.log('ERR',e.message));
 await pg.route(/romanticroute\.kr\/photo-map\.js/, rt=>rt.fulfill({body:fs.readFileSync(R+'photo-map.js'),contentType:'text/javascript'}));
 await pg.goto('https://romanticroute.kr/map.html',{waitUntil:'domcontentloaded'}); await pg.waitForTimeout(2500);
 if(!/map\.html/.test(pg.url())) await pg.goto('https://romanticroute.kr/map.html',{waitUntil:'domcontentloaded'});
 await pg.waitForTimeout(6000);
 await pg.evaluate(()=>window.okbmPhotoMap.open({minLat:33,maxLat:38.7,minLng:125,maxLng:130})); await pg.waitForTimeout(3000);
 for (const bg of ['sky','white','navy']) {
   const data=await pg.evaluate(async(bg)=>{const c=await okbmPhotoMap.exportImage({bg});return c.toDataURL('image/jpeg',0.9);},bg);
   fs.writeFileSync((process.env.OUT||__dirname+'/img')+'/share-'+bg+'.jpg', Buffer.from(data.split(',')[1],'base64'));
 }
 await b.close();
})();
