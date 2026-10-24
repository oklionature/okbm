const pw=require('playwright'),fs=require('fs');
(async()=>{const D=process.argv[2]; const b=await pw.chromium.launch({channel:'chrome'}); const pg=await (await b.newContext({viewport:{width:410,height:900},deviceScaleFactor:2})).newPage();

const html=fs.readFileSync(D+'/notice.html','utf8').replace('src="card.jpg"','src="data:image/jpeg;base64,'+fs.readFileSync(D+'/card.jpg').toString('base64')+'"');
await pg.route('https://romanticroute.kr/__notice',rt=>rt.fulfill({body:html,contentType:'text/html'})); await pg.goto('https://romanticroute.kr/__notice',{waitUntil:'networkidle'});
const ok=await pg.evaluate(async()=>{const t=document.body.innerText;await Promise.all([document.fonts.load('600 25px "Noto Serif KR"',t),document.fonts.load('700 20px "Space Grotesk"','0123456789/ ROMANTIC'),document.fonts.load('500 20px "Space Grotesk"','0123456789/')]);await document.fonts.ready;return getComputedStyle(document.querySelector('h1')).fontFamily;});
console.log('h1 font',ok); await pg.waitForTimeout(800);
console.log('h',await pg.evaluate(()=>document.querySelector('.w').getBoundingClientRect().height));
await pg.locator('.w').screenshot({path:D+'/photo-map.jpg',type:'jpeg',quality:88});
await b.close();})();
