// =========================================================================
// 박지 이상형 월드컵 32강 (2026-11-09, 대표님. 시안 audit/worldcup32/index.html)
//
// 지도 '낭만루터 참여' 칸(map-gear-card.js)에서 받아 연다. 아래 메뉴(56px) 위까지 덮는 층 하나에
//   (휴대폰에선 아래 메뉴가 맨 위 층이라, 바닥까지 덮으면 아래쪽 단추·글이 메뉴에 가려진다)
//   시작 → 대결(32강~결승, 31번) → 2·3위 고르기(1위도 바꿀 수 있음) → 결과
// 결과의 1·2·3위는 라운지 '내 최애 박지 TOP 3' 설문 답으로 들어간다(lounge.js okbmLoungeTop3Put → okbm_top3_submit).
// 예전에 답했다면 이번 결과로 바뀐다.
// 로그인 안 했으면 고른 답을 localStorage에 두고 로그인 창을 연다. 로그인 뒤 지도가 다시 열리면 map-gear-card.js가 이어서 넣는다.
// 인라인 onclick을 쓰지 않는다(CSP 해시가 필요 없게).
// =========================================================================
(function () {
  'use strict';
  if (window.okbmWorldcup) return;

  var POLL_ID = '8945c4dc-86c4-4728-9425-b5ca46895179'; // 라운지 '내 최애 박지 TOP 3를 알려 주세요'(오라네, 11-07)
  var PENDING = 'okbm_wc_pending';
  var R2 = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/';

  // [id, 이름, 보조 이름, 시군, 해발, 사진 올린 사람, 사진(R2 열쇠)] — 11-09 후기+피드 순 32곳. 사진은 그 박지 피드에서
  var RAW = [
    ['21', '선자령', '풍력단지 능선', '평창군', 1157, '가영', 'okbm/fe2962ea-5212-4d3d-8669-ce6b839378ca/0d8c54e2-5e93-425c-9cb8-e13555e58031.jpg'],
    ['264', '무의도', '무렝게티', '영종구', 13, 'Jiyeon', 'okbm/e0817167-1b1c-4042-85b4-87d63c13cc8e/b8bd6567-c36b-4822-96d2-0dc995060c44.jpg'],
    ['20', '굴업도', '개머리언덕', '옹진군', 120, '빠루', 'okbm/132191be-63d8-43b9-9c2a-1b401198ad75/c7bcd0e1-6b00-4ee3-a3a0-296c49bf3fcf.jpg'],
    ['40', '조비산', '암벽 동굴박지', '용인시', 295, 'Jiyeon', 'okbm/e0817167-1b1c-4042-85b4-87d63c13cc8e/2c3237cb-5741-4c4a-bed4-53fed7599b22.jpg'],
    ['571', '원적산', '천덕봉', '이천시', 634, '지석현', 'okbm/5ed0faed-e7cf-4246-93e2-64588893d03c/b2ab2af1-50cd-4eb9-9c46-bc77e92ab8df.jpg'],
    ['97', '우도 비양도', '망루 잔디밭', '제주시', 15, 'Jiyeon', 'okbm/e0817167-1b1c-4042-85b4-87d63c13cc8e/e1a1a5c0-484f-4b07-bb2d-e3fe27a65945.jpg'],
    ['298', '개도', '청석포 천연 너럭바위 해변노지 (돌침대 박지)', '여수시', 15, 'Jiyeon', 'okbm/e0817167-1b1c-4042-85b4-87d63c13cc8e/6b9262bc-feaf-4725-bc4b-58b93fd128b8.jpg'],
    ['18', '원적산', '원적봉', '이천시', 564, '오렌지그린', 'okbm/b139d0f0-ba9a-4be7-8676-60b08beb95b7/bae4db26-c634-47c4-9938-67ef9e3690ea.jpg'],
    ['10', '예빈산', '소화묘원 정상데크', '남양주시', 590, '양주백패커', 'okbm/6e6e6ff3-9261-4fd5-9259-36e1b2ccb0d7/6ae1f89a-f8e7-49f9-9c9a-47c819b21b5d.jpg'],
    ['284', '마구산', '정상 데크', '용인시', 595, '나른이', 'okbm/0affc840-c715-4de8-bd6e-675bff0c1a60/155a202e-1a89-4294-b3ba-576baec2dca7.jpg'],
    ['51', '용문산', '백운봉 정상데크', '양평군', 940, '오라네', 'feed_migrated_1UCjl9G6le9V4OIczzXxT027kyKfnMhgL.jpg'],
    ['136', '마니산', '비밀박지', '강화군', 240, '친절한 마리오', 'okbm/969418ee-24cb-42c7-97a4-ef75a5861f3c/93d00c1a-e902-4a07-a6fc-4b37611278a7.jpg'],
    ['343', '금강산 신선대', '성인대', '고성군', 645, '메멘토모리', 'okbm/2b507dd8-27da-4b3c-bcd1-f93402a01ef9/0f7a1193-7a5a-4788-8a92-de60348364af.jpg'],
    ['378', '민둥산', '정상 부근 데크·능선', '정선군', 1119, '오렌지그린', 'okbm/b139d0f0-ba9a-4be7-8676-60b08beb95b7/7279af94-b7e5-4e8a-b0e3-93aa9fb87f13.jpg'],
    ['349', '산너미목장', '육십마지기 능선 초원', '평창군', 750, '수리미나', 'okbm/c71851f5-3d84-45d4-8434-1690e5a3f964/d3f1df8b-44f0-42df-85ba-599b065d6f9b.jpg'],
    ['311', '호명산', '호명산 잣나무숲 (백패커 전용 유료 야영장)', '가평군', 280, '조주현', 'okbm/c942af0d-3dae-4940-8e00-63b85baef6f0/1ec88eb1-2152-4ded-b53d-21b0eb2a94b3.jpg'],
    ['146', '국사봉', '국사봉 전망대 데크', '안성시', 444, '보라돌이', 'okbm/b9d6d13d-e31e-4de6-a9c4-eb44772aad78/16ec460d-e86f-4d48-a249-23170772ced2.jpg'],
    ['140', '풍도', '붉배 해안암반', '안산시', 10, '낭만루트', 'okbm/d3d8c8fc-1c19-48eb-9c20-e2e92b7ad593/12678bb3-d560-4fd0-b50c-eb658a59ad36.jpg'],
    ['543', '죽도', '죽도 야영장', '홍성군', 5, '쭌쭈니예예니', 'okbm/c6cc0714-9b14-4c07-bc68-460d7ed3c550/32e9ac6c-e21e-4302-9e09-8114067ace8c.jpg'],
    ['2', '고봉', '파노라마 능선', '충주시', 459, '쭌쭈니예예니', 'okbm/c6cc0714-9b14-4c07-bc68-460d7ed3c550/fb0cdffd-f568-4edb-b494-39a5f398cf36.jpg'],
    ['332', '연곡해변 솔향기', '백패커 전용 솔밭 데크존', '강릉시', 5, '오라네', 'feed_1790065649846_6ypibe.jpg'],
    ['83', '지경리', '해식동굴 해안바위', '경주시', 5, 'roxy', 'okbm/9a259bca-dced-4977-82a3-c9060b2f2a52/bb81ad57-7e1c-457e-bdf9-75f4c98cd23c.jpg'],
    ['81', '금능해수욕장', '야자수 잔디노지', '제주시', 5, '형규', 'okbm/cf076b49-0f6f-425d-b490-f1335d060add/314e9595-92a5-46e4-925c-59efe505326e.jpg'],
    ['384', '도마치계곡', '용소', '포천시', 214, '오라네', 'feed_1790070841045_cf8d8n.jpg'],
    ['48', '금성산', '절벽 돌침대', '합천군', 592, '바닐라맛개구리', 'okbm/b9968a16-fecf-40be-b9f0-e8ca693c995c/4cffe94d-8b05-4ce3-a96b-1b6e1e93fc35.jpg'],
    ['147', '수암산', '법륜사 풍차데크', '예산군', 222, '슈퍼뚱땡이', 'okbm/3bd41d52-03a2-4bdd-bc7c-03833329ed8b/b82a043f-548a-4ed0-bef2-a366dd2a641c.jpg'],
    ['301', '대매물도', '당금마을 폐교 바다전망 잔디야영장 (구 한산초 매물도분교 터)', '통영시', 45, '백패커2995', 'okbm/9808355c-2aa9-414b-aa39-0021959f3b3f/22d7a9c0-38fb-4894-a804-98efb1857b5f.jpg'],
    ['27', '초도 상산봉', '정상 데크', '여수시', 339, 'Kingpota817', 'okbm/ce4423f2-7263-4483-8c2c-7cce18c7c284/db54d7c8-3384-4db9-85b1-5b3a0f5d64a8.jpg'],
    ['105', '덕적도', '비조봉 솔로데크', '옹진군', 233, 'Jiyeon', 'okbm/e0817167-1b1c-4042-85b4-87d63c13cc8e/15baeeae-898c-4589-94aa-1195e14f64f3.jpg'],
    ['106', '장봉도', '제1전망대 데크', '옹진군', 50, '고우영', 'okbm/88bd6fe6-b605-4ad9-8e7f-96bb5993e8e1/c1ba0525-9fef-4adc-8305-f3d7939a9ca0.jpg'],
    ['576', '곤신봉 부근 능선', '능선', '평창군', 1131, '김홍철', 'okbm/ddf23a00-dc68-4a7a-b1c6-c45f4d41dc17/9cd07dac-ff21-4318-a029-0d121827f249.jpg'],
    ['14', '향수산', '전망대 데크', '용인시', 420, '오라네', 'feed_1790077921509_3001s5.jpg']
  ];
  var MOSAIC = ['21', '264', '20', '40', '97', '298', '18', '10', '51', '343', '378', '311'];

  function img(key, w) {
    var u = R2 + key;
    return typeof window.okbmFastImageUrl === 'function' ? window.okbmFastImageUrl(u, w) : u;
  }
  var SPOTS = RAW.map(function (r, i) {
    return { id: r[0], name: r[1], sub: r[2], city: r[3], ele: r[4], by: r[5], rank: i + 1, big: img(r[6], 1080), sm: img(r[6], 320) };
  });
  var BY_ID = {};
  SPOTS.forEach(function (s) { BY_ID[s.id] = s; });
  // 32곳에 없는 박지는 지도에 받아 둔 박지 목록(window.spots)에서 찾는다
  var LIST = null;
  function list() {
    if (LIST) return LIST;
    LIST = SPOTS.slice();
    (Array.isArray(window.spots) ? window.spots : []).forEach(function (x) {
      var id = String((x && x.id) || '').trim();
      if (!id || BY_ID[id]) return;
      var s = { id: id, name: String(x.spot_main || x.name || '').trim(), sub: String(x.spot_sub || '').trim(), city: String(x.cityName || x.region || '').trim(), ele: x.elevation || null, by: '', rank: 999, big: '', sm: '' };
      if (!s.name) return;
      BY_ID[id] = s;
      LIST.push(s);
    });
    return LIST;
  }

  var CSS = [
    '.okbm-wc{--bg-0:#000;--bg-1:#0f0f11;--bg-2:#17171b;--bg-3:#2a2a30;--line:rgba(255,255,255,.08);--line-strong:rgba(255,255,255,.16);--tx-1:#f2f2f3;--tx-2:#d1d1d6;--tx-3:#8b8b93;--accent:#4c94f8;--accent-fill:#2b6fd6;--gold:#e9c46a;--silver:#c9ced6;--bronze:#d29a6a;position:fixed;left:0;right:0;top:0;bottom:calc(56px + env(safe-area-inset-bottom,0px));z-index:calc(var(--z-modal,1000) + 40);background:var(--bg-0);color:var(--tx-1);font-size:13px;-webkit-tap-highlight-color:transparent;padding-top:env(safe-area-inset-top,0px);box-sizing:border-box;word-break:keep-all}',
    '.okbm-wc[hidden],.okbm-wc [hidden]{display:none!important}',
    '.okbm-wc *{box-sizing:border-box}',
    '.okbm-wc button{font:inherit;color:inherit}',
    '.okbm-wc .app{height:100%;max-width:480px;margin:0 auto;display:flex;flex-direction:column;position:relative}',
    '.okbm-wc .view{flex:1;min-height:0;display:flex;flex-direction:column}',
    '.okbm-wc .pad{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}',
    '.okbm-wc .bar{height:52px;flex:none;display:grid;grid-template-columns:76px 1fr 76px;align-items:center}',
    '.okbm-wc .bar h1{margin:0;text-align:center;font-size:15px;font-weight:700;letter-spacing:-.01em}',
    '.okbm-wc .bar h1 small{display:block;font-size:11px;font-weight:500;color:var(--tx-3);margin-top:1px;font-variant-numeric:tabular-nums}',
    '.okbm-wc .ghost{background:none;border:0;padding:8px 0;color:var(--tx-2);font-size:13px;text-align:left;cursor:pointer;min-height:44px}',
    '.okbm-wc .ghost.r{text-align:right}',
    '.okbm-wc .ghost[disabled]{color:var(--bg-3);cursor:default}',
    '.okbm-wc .ghost:focus-visible,.okbm-wc .card:focus-visible,.okbm-wc .btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '.okbm-wc .progress{height:3px;background:var(--bg-2);flex:none}',
    '.okbm-wc .progress i{display:block;height:100%;background:var(--accent);width:0;transition:width .3s ease}',
    '.okbm-wc .intro{overflow-y:auto;padding-block:8px 24px;display:flex;flex-direction:column;gap:20px}',
    '.okbm-wc .mosaic{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;border-radius:14px;overflow:hidden}',
    '.okbm-wc .mosaic img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:var(--bg-2)}',
    '.okbm-wc .mosaic .vs{grid-column:2 / span 2;grid-row:2;display:grid;place-items:center;background:var(--bg-1)}',
    '.okbm-wc .mosaic .vs b{font-size:34px;font-weight:900;letter-spacing:-.03em}',
    '.okbm-wc .mosaic .vs b span,.okbm-wc .vsdot span{color:var(--accent)}',
    '.okbm-wc .intro h2{margin:0;font-size:24px;font-weight:900;letter-spacing:-.02em;text-wrap:balance}',
    '.okbm-wc .lead{margin:6px 0 0;color:var(--tx-2);font-size:14px;line-height:1.6}',
    '.okbm-wc .facts{margin:0;border-top:1px solid var(--line)}',
    '.okbm-wc .facts div{display:grid;grid-template-columns:64px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);line-height:1.55}',
    '.okbm-wc .facts dt{color:var(--tx-3);font-size:12px;padding-top:1px}',
    '.okbm-wc .facts dd{margin:0;color:var(--tx-1)}',
    '.okbm-wc .facts dd em{font-style:normal;color:var(--gold)}',
    '.okbm-wc .btn{display:block;width:100%;border:0;border-radius:12px;padding:15px 16px;font-size:15px;font-weight:700;cursor:pointer;text-align:center}',
    '.okbm-wc .btn.primary{background:var(--accent-fill);color:#fff}',
    '.okbm-wc .btn.line{background:var(--bg-2);color:var(--tx-1)}',
    '.okbm-wc .btn[disabled]{background:var(--bg-2);color:var(--tx-3);cursor:default}',
    '.okbm-wc .note{color:var(--tx-3);font-size:12px;line-height:1.6;margin:0}',
    '.okbm-wc .duel{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;padding-block:8px 10px;position:relative}',
    '.okbm-wc .card{flex:1;min-height:0;position:relative;border:0;padding:0;border-radius:16px;overflow:hidden;background:var(--bg-2);cursor:pointer;text-align:left;transition:transform .28s ease,opacity .28s ease,filter .28s ease}',
    '.okbm-wc .card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.okbm-wc .card::after,.okbm-wc .champ::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.8) 100%)}',
    '.okbm-wc .cap{position:absolute;left:14px;right:14px;bottom:12px;z-index:1;display:flex;flex-direction:column;gap:3px}',
    '.okbm-wc .card .nm{font-size:22px;font-weight:900;letter-spacing:-.02em;line-height:1.15;text-shadow:0 1px 8px rgba(0,0,0,.5)}',
    '.okbm-wc .sb{font-size:14px;font-weight:500;color:var(--tx-1);line-height:1.3}',
    '.okbm-wc .mt{font-size:12px;color:var(--tx-2);font-variant-numeric:tabular-nums}',
    '.okbm-wc .by{position:absolute;top:10px;right:10px;z-index:1;font-size:11px;color:var(--tx-1);background:rgba(0,0,0,.45);padding:4px 8px;border-radius:99px}',
    '.okbm-wc .card.win{transform:scale(1.02);box-shadow:0 0 0 3px var(--accent)}',
    '.okbm-wc .card.lose{opacity:.25;filter:grayscale(1);transform:scale(.97)}',
    '.okbm-wc .vsdot{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;width:48px;height:48px;border-radius:50%;background:var(--bg-0);display:grid;place-items:center;font-weight:900;font-size:15px;letter-spacing:-.02em;box-shadow:0 0 0 4px var(--bg-0);pointer-events:none}',
    '.okbm-wc .hint{text-align:center;color:var(--tx-3);font-size:12px;padding-bottom:8px;flex:none}',
    '.okbm-wc .stage{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(0,0,0,.86);opacity:0;pointer-events:none;transition:opacity .25s ease}',
    '.okbm-wc .stage.on{opacity:1}',
    '.okbm-wc .stage div{text-align:center}',
    '.okbm-wc .stage b{display:block;font-size:52px;font-weight:900;letter-spacing:-.04em}',
    '.okbm-wc .stage span{color:var(--tx-3);font-size:14px}',
    '.okbm-wc .result{overflow-y:auto;padding-block:4px 28px;display:flex;flex-direction:column;gap:16px}',
    '.okbm-wc .result>*,.okbm-wc .intro>*,.okbm-wc .pick>*{flex:none}',
    '.okbm-wc .champ{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:4 / 5;max-height:52vh;width:100%;background:var(--bg-2)}',
    '.okbm-wc .champ img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.okbm-wc .champ .cap{left:16px;right:16px;bottom:14px;gap:4px}',
    '.okbm-wc .rank{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--gold);letter-spacing:.02em}',
    '.okbm-wc .rank::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor}',
    '.okbm-wc .champ .nm{font-size:28px;font-weight:900;letter-spacing:-.03em;line-height:1.1}',
    '.okbm-wc .champ .sb{font-size:15px}',
    '.okbm-wc .rows{display:grid;gap:8px}',
    '.okbm-wc .row{display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center;background:var(--bg-1);border-radius:12px;padding:8px}',
    '.okbm-wc .row img,.okbm-wc .row .ph{width:64px;height:64px;border-radius:8px;object-fit:cover}',
    '.okbm-wc .row .t{min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.okbm-wc .row .t b{font-size:15px;font-weight:700}',
    '.okbm-wc .row .t span:not(.rank){font-size:12px;color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.okbm-wc .r2 .rank{color:var(--silver)}',
    '.okbm-wc .r3 .rank{color:var(--bronze)}',
    '.okbm-wc .saved{background:var(--bg-1);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px;line-height:1.6}',
    '.okbm-wc .saved b{font-size:14px}',
    '.okbm-wc .saved p{margin:0;color:var(--tx-2)}',
    '.okbm-wc .saved .old{color:var(--tx-3);font-size:12px}',
    '.okbm-wc .eight h3{margin:0 0 8px;font-size:13px;color:var(--tx-3);font-weight:500}',
    '.okbm-wc .eight ul{list-style:none;margin:0;padding:0 0 4px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}',
    '.okbm-wc .eight ul::-webkit-scrollbar{display:none}',
    '.okbm-wc .eight li{display:flex;flex-direction:column;gap:4px;min-width:0;flex:0 0 72px}',
    '.okbm-wc .eight img,.okbm-wc .eight .ph{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px}',
    '.okbm-wc .eight span{font-size:11px;color:var(--tx-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.okbm-wc .acts{display:grid;gap:8px}',
    '.okbm-wc .pick{overflow-y:auto;padding-block:4px 16px;display:flex;flex-direction:column;gap:14px}',
    '.okbm-wc .pick h2{margin:0;font-size:20px;font-weight:900;letter-spacing:-.02em;text-wrap:balance}',
    '.okbm-wc .pick .lead{margin:4px 0 0;font-size:13px}',
    '.okbm-wc .subhead{margin:0;font-size:12px;color:var(--tx-3);font-weight:500}',
    '.okbm-wc .tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.okbm-wc .tile{position:relative;border:0;padding:0;background:var(--bg-1);border-radius:12px;overflow:hidden;text-align:left;cursor:pointer;display:flex;flex-direction:column;min-width:0}',
    '.okbm-wc .tile img,.okbm-wc .tile .ph{width:100%;aspect-ratio:4 / 3;object-fit:cover;display:block}',
    '.okbm-wc .tile .tx{padding:8px 10px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}',
    '.okbm-wc .tile .tx b{font-size:14px}',
    '.okbm-wc .tile .tx span{font-size:11px;color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.okbm-wc .tile .tag{position:absolute;top:8px;left:8px;font-size:11px;color:var(--tx-1);background:rgba(0,0,0,.55);padding:3px 7px;border-radius:99px}',
    '.okbm-wc .tile .pk{position:absolute;top:8px;right:8px;min-width:36px;height:26px;padding:0 8px;border-radius:99px;display:none;place-items:center;font-weight:900;font-size:13px;color:#16120a}',
    '.okbm-wc .tile::after,.okbm-wc .slot::after{content:"";position:absolute;inset:0;border-radius:12px;border:3px solid transparent;pointer-events:none}',
    '.okbm-wc .tile.p1::after{border-color:var(--gold)}.okbm-wc .tile.p1 .pk{display:grid;background:var(--gold)}',
    '.okbm-wc .tile.p2::after{border-color:var(--silver)}.okbm-wc .tile.p2 .pk{display:grid;background:var(--silver)}',
    '.okbm-wc .tile.p3::after{border-color:var(--bronze)}.okbm-wc .tile.p3 .pk{display:grid;background:var(--bronze)}',
    '.okbm-wc .tile:focus-visible,.okbm-wc .slot:focus-visible,.okbm-wc .found button:focus-visible,.okbm-wc .search input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '.okbm-wc .slots{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;position:sticky;top:0;z-index:2;background:var(--bg-0);padding-block:4px 8px}',
    '.okbm-wc .slot{position:relative;border:0;border-radius:12px;background:var(--bg-1);padding:0;overflow:hidden;cursor:pointer;text-align:left;display:flex;flex-direction:column;min-width:0}',
    '.okbm-wc .slot .ph,.okbm-wc .slot img{width:100%;aspect-ratio:4 / 3;object-fit:cover;display:block}',
    '.okbm-wc .slot .tx{padding:6px 8px 8px;display:flex;flex-direction:column;gap:1px;min-width:0}',
    '.okbm-wc .slot .tx em{font-style:normal;font-size:11px;font-weight:700}',
    '.okbm-wc .slot .tx b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.okbm-wc .slot .tx b.empty{color:var(--tx-3);font-weight:500}',
    '.okbm-wc .slot::after{border-width:2px}',
    '.okbm-wc .slot.on::after{border-color:var(--accent)}',
    '.okbm-wc .slot.s1 em{color:var(--gold)}.okbm-wc .slot.s2 em{color:var(--silver)}.okbm-wc .slot.s3 em{color:var(--bronze)}',
    '.okbm-wc .ph{display:grid;place-items:center;background:linear-gradient(160deg,#1f2a36,#101418);color:var(--tx-3);font-size:11px}',
    '.okbm-wc .champ .ph{position:absolute;inset:0;font-size:13px}',
    '.okbm-wc .search{display:flex;flex-direction:column;gap:8px}',
    '.okbm-wc .search input{width:100%;background:var(--bg-1);border:1px solid var(--line-strong);border-radius:12px;padding:13px 14px;font:inherit;font-size:16px;color:var(--tx-1)}',
    '.okbm-wc .search input::placeholder{color:var(--tx-3)}',
    '.okbm-wc .found{list-style:none;margin:0;padding:0;display:grid;gap:4px}',
    '.okbm-wc .found button{width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;background:var(--bg-1);border:0;border-radius:10px;padding:12px;cursor:pointer;text-align:left}',
    '.okbm-wc .found b{font-size:14px;font-weight:500;min-width:0}',
    '.okbm-wc .found span{font-size:12px;color:var(--tx-3);flex:none}',
    '.okbm-wc .found .in{color:var(--accent)}',
    '.okbm-wc .pickfoot{flex:none;padding-block:10px 12px;border-top:1px solid var(--line);background:var(--bg-0)}',
    '.okbm-wc .toast{position:absolute;left:50%;bottom:36px;transform:translate(-50%,12px);background:var(--bg-3);color:var(--tx-1);padding:10px 14px;border-radius:10px;font-size:13px;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;width:max-content;max-width:calc(100% - 32px);z-index:9}',
    '.okbm-wc .toast.on{opacity:1;transform:translate(-50%,0)}',
    '@media (min-height:760px){.okbm-wc .card .nm{font-size:24px}}',
    '@media (prefers-reduced-motion:reduce){.okbm-wc .card,.okbm-wc .stage,.okbm-wc .progress i,.okbm-wc .toast{transition:none}}'
  ].join('');

  var CLOSE = '<button class="ghost r" type="button" data-wc="close">닫기</button>';
  var HTML = '<div class="app">' +
    '<section class="view" data-v="intro">' +
      '<div class="bar pad"><span></span><h1>박지월드컵</h1>' + CLOSE + '</div>' +
      '<div class="intro pad">' +
        '<div class="mosaic" data-el="mosaic"></div>' +
        '<div><h2>가장 가고 싶은 박지 한 곳은?</h2><p class="lead">후기와 피드가 많은 박지 32곳이 둘씩 붙어요. 더 가고 싶은 쪽을 누르면 돼요.</p></div>' +
        '<dl class="facts">' +
          '<div><dt>진행</dt><dd>32강부터 결승까지 31번 골라 1위를 정해요. 마지막에 2위와 3위를 직접 골라요. 1위도 그때 바꿀 수 있어요.</dd></div>' +
          '<div><dt>결과</dt><dd>내 1·2·3위가 라운지 <em>\'내 최애 박지 TOP 3\'</em> 설문 답으로 들어가요. 예전에 답했다면 이번 결과로 바뀌어요.</dd></div>' +
          '<div><dt>32곳</dt><dd>후기 수와 피드 수를 더한 순서로 뽑았어요. 사진은 그 박지 피드에서 가져왔어요.</dd></div>' +
        '</dl>' +
        '<button class="btn primary" type="button" data-wc="start" data-metric-click="feat_wc_start">32강 시작</button>' +
        '<button class="btn line" type="button" data-wc="direct" data-metric-click="feat_wc_direct">32곳에 없는 박지라면, 바로 TOP 3 고르기</button>' +
      '</div>' +
    '</section>' +
    '<section class="view" data-v="duel" hidden>' +
      '<div class="bar pad"><button class="ghost" type="button" data-wc="undo">되돌리기</button><h1 data-el="round">32강</h1>' + CLOSE + '</div>' +
      '<div class="progress"><i data-el="prog"></i></div>' +
      '<div class="duel pad">' +
        '<button class="card" type="button" data-wc="pickA"></button>' +
        '<button class="card" type="button" data-wc="pickB"></button>' +
        '<div class="vsdot" aria-hidden="true"><b>V<span>S</span></b></div>' +
      '</div>' +
      '<div class="hint">더 가고 싶은 박지를 누르세요</div>' +
      '<div class="stage" data-el="stage"><div><b data-el="stageName"></b><span data-el="stageSub"></span></div></div>' +
    '</section>' +
    '<section class="view" data-v="pick" hidden>' +
      '<div class="bar pad"><button class="ghost" type="button" data-wc="pickBack">되돌리기</button><h1>TOP 3 고르기</h1>' + CLOSE + '</div>' +
      '<div class="pick pad" data-el="pickBody"></div>' +
      '<div class="pickfoot pad"><button class="btn primary" type="button" data-wc="pickDone" data-metric-click="feat_wc_submit" disabled>2위를 골라 주세요</button></div>' +
    '</section>' +
    '<section class="view" data-v="result" hidden>' +
      '<div class="bar pad"><span></span><h1>나의 최애 박지</h1>' + CLOSE + '</div>' +
      '<div class="result pad" data-el="resultBody"></div>' +
    '</section>' +
    '<div class="toast" data-el="toast" role="status"></div>' +
  '</div>';

  var root = null, st = null, hist = [], busy = false, sending = false;
  function $(k) { return root.querySelector('[data-el="' + k + '"]'); }
  function btn(k) { return root.querySelector('[data-wc="' + k + '"]'); }

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function roundLabel(n) { return n === 2 ? '결승' : n === 4 ? '4강' : n + '강'; }
  function meta(s) { var p = []; if (s.city) p.push(s.city); if (s.ele != null && s.ele !== '' && Number(s.ele)) p.push('해발 ' + Number(s.ele).toLocaleString('ko-KR') + 'm'); return p.join(' · '); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function show(v) { Array.prototype.forEach.call(root.querySelectorAll('.view'), function (el) { el.hidden = el.getAttribute('data-v') !== v; }); }
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 2200); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function cardHtml(s) {
    return '<img src="' + esc(s.big) + '" alt="">' +
      (s.by ? '<span class="by">사진 ' + esc(s.by) + '</span>' : '') +
      '<span class="cap"><span class="nm">' + esc(s.name) + '</span>' +
      (s.sub ? '<span class="sb">' + esc(s.sub) + '</span>' : '') +
      '<span class="mt">' + esc(meta(s)) + '</span></span>';
  }

  function mosaic() {
    var h = '';
    MOSAIC.forEach(function (id, i) {
      if (i === 5) h += '<div class="vs"><b>V<span>S</span></b></div>';
      if (i === 5 || i === 6) return;
      h += '<img src="' + esc(BY_ID[id].sm) + '" alt="">';
    });
    $('mosaic').innerHTML = h;
  }

  function start() {
    st = { round: shuffle(SPOTS.map(function (s) { return s.id; })), next: [], i: 0, semi: [], eight: [], champ: null, runner: null, picks: [null, null, null], slot: 1, q: '', showAll: false, direct: false };
    hist = [];
    show('duel'); paint();
  }

  function paint() {
    var n = st.round.length;
    var a = BY_ID[st.round[st.i * 2]], b = BY_ID[st.round[st.i * 2 + 1]];
    $('round').innerHTML = roundLabel(n) + '<small>' + (n === 2 ? '마지막 한 번' : (st.i + 1) + ' / ' + (n / 2)) + '</small>';
    $('prog').style.width = ((SPOTS.length - n + st.i) / SPOTS.length * 100) + '%';
    [['pickA', a], ['pickB', b]].forEach(function (p) {
      var el = btn(p[0]); el.className = 'card'; el.dataset.id = p[1].id; el.innerHTML = cardHtml(p[1]);
      el.setAttribute('aria-label', p[1].name + ' ' + p[1].sub + ' 고르기');
    });
    btn('undo').disabled = hist.length === 0;
    st.round.slice(st.i * 2 + 2, st.i * 2 + 4).forEach(function (id) { var im = new Image(); im.src = BY_ID[id].big; });
  }

  function pick(which) {
    if (busy) return;
    var win = btn(which), lose = btn(which === 'pickA' ? 'pickB' : 'pickA');
    var wid = win.dataset.id, lid = lose.dataset.id;
    hist.push(clone(st));
    busy = true;
    win.classList.add('win'); lose.classList.add('lose');
    setTimeout(function () { busy = false; advance(wid, lid); }, 420);
  }

  function advance(wid, lid) {
    var n = st.round.length;
    if (n === 8) st.eight.push(lid);
    if (n === 4) st.semi.push(lid);
    if (n === 2) { st.champ = wid; st.runner = lid; st.picks = [wid, null, null]; st.slot = 1; st.q = ''; st.showAll = false; return stage('1위', BY_ID[wid].name, openPick); }
    st.next.push(wid); st.i++;
    if (st.i * 2 >= n) {
      st.round = st.next; st.next = []; st.i = 0;
      var m = st.round.length;
      return stage(roundLabel(m), m === 2 ? '마지막 한 번 남았어요' : (m / 2) + '번 남았어요', paint);
    }
    paint();
  }

  function stage(name, sub, then) {
    $('stageName').textContent = name; $('stageSub').textContent = sub;
    var s = $('stage'); s.classList.add('on');
    busy = true;
    setTimeout(function () { busy = false; then(); setTimeout(function () { s.classList.remove('on'); }, 120); }, 850);
  }

  function undo() {
    if (!hist.length || busy) return;
    st = hist.pop(); show('duel'); paint();
  }

  // 8강까지 오른 일곱 곳: 결승에서 진 곳 → 4강 → 8강 순
  function reached() {
    var r = {};
    r[st.runner] = '결승';
    st.semi.forEach(function (id) { r[id] = '4강'; });
    st.eight.forEach(function (id) { r[id] = '8강'; });
    return { map: r, top: [st.runner].concat(st.semi, st.eight) };
  }

  function thumb(s, big) { var u = big ? s.big : s.sm; return u ? '<img src="' + esc(u) + '" alt="" loading="lazy">' : '<div class="ph">사진 없음</div>'; }
  function slotOf(id) { return st.picks.indexOf(id); }
  function firstEmpty() { return st.picks.indexOf(null); }

  function tileHtml(id, tag) {
    var s = BY_ID[id], k = slotOf(id);
    return '<button type="button" class="tile' + (k >= 0 ? ' p' + (k + 1) : '') + '" data-id="' + esc(id) + '" aria-pressed="' + (k >= 0) + '">' +
      thumb(s) +
      (tag ? '<span class="tag">' + esc(tag) + '</span>' : '') +
      '<span class="pk">' + (k >= 0 ? (k + 1) + '위' : '') + '</span>' +
      '<span class="tx"><b>' + esc(s.name) + '</b><span>' + esc(s.sub || meta(s)) + '</span></span></button>';
  }

  function slotHtml(i) {
    var s = st.picks[i] ? (BY_ID[st.picks[i]] || { name: '', sm: '' }) : null, on = st.slot === i;
    return '<button type="button" class="slot s' + (i + 1) + (on ? ' on' : '') + '" data-slot="' + i + '" aria-pressed="' + on + '">' +
      (s ? thumb(s) : '<div class="ph">비어 있음</div>') +
      '<span class="tx"><em>' + (i + 1) + '위</em>' + (s ? '<b>' + esc(s.name) + '</b>' : '<b class="empty">' + (on ? '여기에 넣어요' : '누르고 고르기') + '</b>') + '</span></button>';
  }

  // 월드컵을 거치지 않고 바로 TOP 3 고르기(32곳에 없는 박지를 찾는 사람)
  function direct() {
    st = { round: [], next: [], i: 0, semi: [], eight: [], champ: null, runner: null, picks: [null, null, null], slot: 0, q: '', showAll: true, direct: true };
    hist = [];
    openPick();
  }

  function openPick() {
    show('pick'); paintPick();
    $('pickBody').scrollTop = 0;
  }

  function norm(t) { return String(t).replace(/\s+/g, '').toLowerCase(); }
  function paintFound() {
    var el = root.querySelector('.found'), q = norm(st.q);
    if (!el) return;
    if (!q) { el.innerHTML = ''; return; }
    var hits = list().filter(function (s) { return norm(s.name + s.sub + s.city).indexOf(q) >= 0; }).slice(0, 15);
    el.innerHTML = hits.length ? hits.map(function (s) {
      var k = slotOf(s.id);
      return '<li><button type="button" data-id="' + esc(s.id) + '"><b>' + esc(s.name + (s.sub ? ' ' + s.sub : '')) + '</b>' +
        (k >= 0 ? '<span class="in">' + (k + 1) + '위</span>' : '<span>' + esc(s.city) + '</span>') + '</button></li>';
    }).join('') : '<li class="note">\'' + esc(st.q) + '\'(으)로 찾은 박지가 없어요</li>';
  }

  function paintPick() {
    var n = list().length;
    var h = '<div class="slots">' + [0, 1, 2].map(slotHtml).join('') + '</div>';
    if (st.direct) h += '<div><h2>내 최애 박지 TOP 3를 골라 주세요</h2><p class="lead">위 칸을 누르고 박지를 고르면 그 칸에 들어가요. 낭만루트 박지 ' + n + '곳 어디든 찾을 수 있어요.</p></div>';
    else h += '<div><h2>2위와 3위를 골라 주세요</h2><p class="lead">위 칸을 누르고 박지를 고르면 그 칸이 바뀌어요. 1위도 바꿀 수 있어요.</p></div>';
    h += '<div class="search"><input data-el="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="박지 이름으로 찾기 (전체 ' + n + '곳)" aria-label="박지 이름으로 찾기" value="' + esc(st.q) + '"><ul class="found"></ul></div>';
    var shown = {};
    if (!st.direct) {
      var r = reached();
      r.map[st.champ] = '우승';
      var top = [st.champ].concat(r.top);
      top.forEach(function (id) { shown[id] = 1; });
      h += '<p class="subhead">월드컵에서 8강까지 오른 곳</p><div class="tiles">' + top.map(function (id) { return tileHtml(id, r.map[id]); }).join('') + '</div>';
    }
    if (st.showAll) {
      var rest = SPOTS.filter(function (s) { return !shown[s.id]; });
      h += '<p class="subhead">' + (st.direct ? '후기·피드가 많은 32곳' : '그 밖의 32강 박지 ' + rest.length + '곳') + '</p><div class="tiles">' + rest.map(function (s) { return tileHtml(s.id, ''); }).join('') + '</div>';
    } else {
      h += '<button class="btn line" type="button" data-wc="showAll">32곳 모두 보기</button>';
    }
    var body = $('pickBody'), keep = body.scrollTop;
    body.innerHTML = h;
    body.scrollTop = keep;
    paintFound();
    var b = btn('pickDone'), e = firstEmpty();
    b.disabled = e >= 0 || sending;
    b.textContent = e >= 0 ? (e + 1) + '위를 골라 주세요' : 'TOP 3 올리기';
  }

  // 고른 칸에 넣기. 다른 칸에 있던 박지면 두 칸을 맞바꾸고, 같은 칸을 다시 누르면 뺀다.
  function place(id) {
    var k = slotOf(id), i = st.slot;
    if (i < 0) i = firstEmpty();
    if (i < 0) { toast('바꿀 칸을 먼저 눌러 주세요'); return; }
    if (k === i) {
      st.picks[i] = null; st.slot = i;
    } else {
      if (k >= 0) st.picks[k] = st.picks[i];
      st.picks[i] = id;
      st.slot = firstEmpty();
    }
    paintPick();
  }

  // ----- 설문에 넣기 -----
  function savePending() {
    try { localStorage.setItem(PENDING, JSON.stringify({ at: Date.now(), st: st })); } catch (e) {}
  }
  function readPending() {
    try {
      var p = JSON.parse(localStorage.getItem(PENDING) || 'null');
      if (p && p.st && Array.isArray(p.st.picks) && Date.now() - (Number(p.at) || 0) < 3 * 86400000) return p;
    } catch (e) {}
    return null;
  }
  function clearPending() { try { localStorage.removeItem(PENDING); } catch (e) {} }
  function loggedIn() { return typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn(); }

  function submit() {
    if (sending || firstEmpty() >= 0) return;
    if (!loggedIn()) {
      // 로그인하면 지도가 새로 열린다. 고른 답을 두었다가 다시 열릴 때 넣는다
      savePending();
      close();
      if (typeof window.openLoginModal === 'function') window.openLoginModal({ message: '로그인하면 고른 TOP 3가 설문에 들어가요.' });
      return;
    }
    sending = true;
    paintPick();
    var ready = typeof window.okbmLoungeTop3Put === 'function' ? Promise.resolve()
      : typeof window.okbmEnsureLounge === 'function' ? Promise.resolve(window.okbmEnsureLounge()) : Promise.reject(new Error('no_lounge'));
    ready.then(function () {
      if (typeof window.okbmLoungeTop3Put !== 'function') throw new Error('no_lounge');
      return window.okbmLoungeTop3Put(POLL_ID, st.picks.slice());
    }).then(function (res) {
      sending = false;
      clearPending();
      finish(res);
    }).catch(function (err) {
      console.warn('[map-worldcup.js:submit]', err);
      sending = false;
      open();
      show('pick'); paintPick();
      var m = String((err && err.message) || err || '');
      toast(/poll_closed/.test(m) ? '마감된 설문이에요' : /login_required/.test(m) ? '로그인하면 설문에 넣을 수 있어요' : '올리지 못했어요. 잠시 뒤 다시 해 주세요');
    });
  }

  function finish(res) {
    // 지도 박지 목록을 아직 못 받았으면(로그인 뒤 이어 넣을 때) 이름은 서버가 돌려준 내 답에서
    var mine = res && res.after && Array.isArray(res.after.mine) ? res.after.mine : [];
    var pickSpot = function (id) {
      if (BY_ID[id]) return BY_ID[id];
      var m = mine.filter(function (x) { return x.key === 's:' + id; })[0];
      return { id: id, name: (m && m.label) || '', sub: '', city: '', ele: null, by: '', big: '', sm: '' };
    };
    var one = pickSpot(st.picks[0]), two = pickSpot(st.picks[1]), three = pickSpot(st.picks[2]);
    var row = function (s, cls, label) {
      return '<div class="row ' + cls + '">' + thumb(s) + '<div class="t"><span class="rank">' + label + '</span><b>' + esc(s.name) + '</b><span>' + esc([s.sub, meta(s)].filter(Boolean).join(' · ')) + '</span></div></div>';
    };
    var h = '<div class="champ">' + thumb(one, true) + (one.by ? '<span class="by">사진 ' + esc(one.by) + '</span>' : '') +
      '<div class="cap"><span class="rank">' + (one.id === st.champ ? '우승 · 1위' : '1위') + '</span><span class="nm">' + esc(one.name) + '</span>' + (one.sub ? '<span class="sb">' + esc(one.sub) + '</span>' : '') + '<span class="mt">' + esc(meta(one)) + '</span></div></div>';
    h += '<div class="rows">' + row(two, 'r2', '2위') + row(three, 'r3', '3위') + '</div>';
    var before = res && Array.isArray(res.before) ? res.before : null;
    var nowKeys = st.picks.map(function (id) { return 's:' + id; }).join('|');
    var oldKeys = before ? before.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (m) { return m.key; }).join('|') : '';
    h += '<div class="saved"><b>내 최애 박지 TOP 3에 들어갔어요</b>' +
      '<p>' + esc(one.name) + ' 3점 · ' + esc(two.name) + ' 2점 · ' + esc(three.name) + ' 1점이 라운지 설문 순위에 더해졌어요.</p>' +
      (before && oldKeys !== nowKeys ? '<span class="old">예전 답 <s>' + before.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (m) { return esc(m.label); }).join(' · ') + '</s> 은 이번 결과로 바뀌었어요.</span>' : '') +
      '</div>';
    if (!st.direct && st.champ) {
      var eight = [st.champ].concat(reached().top).filter(function (id) { return slotOf(id) < 0; }).map(function (id) { return BY_ID[id]; });
      if (eight.length) h += '<div class="eight"><h3>8강까지 오른 다른 곳</h3><ul>' + eight.map(function (s) { return '<li>' + thumb(s) + '<span>' + esc(s.name) + '</span></li>'; }).join('') + '</ul></div>';
    }
    h += '<div class="acts"><button class="btn primary" type="button" data-wc="goPoll" data-metric-click="feat_wc_poll">설문 전체 순위 보기</button><button class="btn line" type="button" data-wc="edit">순위 고치기</button><button class="btn line" type="button" data-wc="again">다시 하기</button></div>';
    $('resultBody').innerHTML = h;
    open();
    show('result');
    $('resultBody').scrollTop = 0;
  }

  function goPoll() {
    close();
    if (typeof window.okbmLoungeOpenPost === 'function') window.okbmLoungeOpenPost(POLL_ID);
  }

  function onClick(e) {
    var t = e.target.closest('[data-wc], .slot, .tile, .found button');
    if (!t || !root.contains(t)) return;
    var k = t.getAttribute('data-wc');
    if (k === 'close') return close();
    if (k === 'start' || k === 'again') return start();
    if (k === 'direct') return direct();
    if (k === 'pickA' || k === 'pickB') return pick(k);
    if (k === 'undo') return undo();
    if (k === 'pickBack') { if (st.direct) show('intro'); else undo(); return; }
    if (k === 'pickDone') return submit();
    if (k === 'showAll') { st.showAll = true; paintPick(); return; }
    if (k === 'goPoll') return goPoll();
    if (k === 'edit') { st.slot = 1; openPick(); return; }
    if (t.classList.contains('slot')) { st.slot = +t.dataset.slot; paintPick(); return; }
    if (t.dataset.id) place(t.dataset.id);
  }

  function build() {
    if (root) return;
    var css = document.createElement('style');
    css.id = 'okbmWorldcupCss';
    css.textContent = CSS;
    document.head.appendChild(css);
    root = document.createElement('div');
    root.className = 'okbm-wc';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '박지 이상형 월드컵');
    root.hidden = true;
    root.innerHTML = HTML;
    root.addEventListener('click', onClick);
    root.addEventListener('input', function (e) {
      if (e.target.getAttribute('data-el') !== 'q') return;
      st.q = e.target.value; paintFound();
    });
    document.body.appendChild(root);
    mosaic();
  }

  function onKey(e) { if (e.key === 'Escape' && root && !root.hidden) close(); }
  function open() {
    build();
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
  }
  function close() {
    if (!root) return;
    root.hidden = true;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  }

  window.okbmWorldcup = {
    // 지도 칸에서 누르면 연다. 하던 게 있으면 그 화면 그대로
    open: function () {
      build();
      if (!st) show('intro');
      open();
    },
    // 로그인 전에 고른 답이 남아 있으면 넣고 결과를 보여 준다(로그인한 뒤에만)
    resume: function () {
      var p = readPending();
      if (!p || !loggedIn()) return false;
      build();
      list();
      st = p.st; hist = []; sending = false;
      submit();
      return true;
    },
    hasPending: function () { return !!readPending(); }
  };
})();
