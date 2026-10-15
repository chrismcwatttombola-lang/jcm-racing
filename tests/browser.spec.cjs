const { test, expect } = require('@playwright/test');
const URL = 'http://127.0.0.1:8765/#picks';
async function openOct9(page) {
  await page.goto(URL);
  await page.locator('#date').selectOption('2026-10-09');
  await expect(page.locator('#jcm-watch-panel')).toBeVisible();
}
async function snapshotMetrics(page) {
  await expect(page.locator('.metrics')).toHaveAttribute('data-overall-state',/ready|error/);
  return page.locator('.metrics').innerText();
}
test('desktop: 7 confirmed watchlist entries, popup, unchanged accuracy', async ({ page }) => {
  await page.goto('http://127.0.0.1:8765/#picks');
  const before = await snapshotMetrics(page);
  await page.locator('#date').selectOption('2026-10-09');
  await expect(page.locator('#jcm-watch-panel .jcm-status.win')).toHaveCount(6);
  await expect(page.locator('#jcm-watch-panel .jcm-status.loss')).toHaveCount(1);
  await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(1);
  await expect(page.locator('#jcm-watch-panel')).toContainText('7 settled · 1 pending · 6 / 1 Win / Loss');
  await expect(page.locator('#jcm-official-panel')).toContainText('No settled picks');
  await expect.poll(() => snapshotMetrics(page)).toBe(before);
  await page.locator('#jcm-watch-panel .jcm-row').first().click();
  await expect(page.locator('#jcm-detail-overlay')).toHaveClass(/open/);
  await expect(page.locator('#jcm-detail-content')).toContainText('Betfair confirmed: 5th');
  await expect(page.locator('#jcm-detail-content a')).toHaveAttribute('href', /^https:\/\/betting\.betfair\.com\/horse-racing\/results\//);
});
test('failed feed request retains pending watchlist and accuracy', async ({ page }) => {
  await page.route('**/data/betfair-results.json', route => route.abort());
  await page.goto(URL);
  const before = await snapshotMetrics(page);
  await page.locator('#date').selectOption('2026-10-09');
  await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(8);
  await expect(page.locator('#jcm-watch-panel .jcm-status.unverified')).toHaveCount(0);
  await expect.poll(() => snapshotMetrics(page)).toBe(before);
});
test('malformed feed fails closed', async ({ page }) => {
  await page.route('**/data/betfair-results.json', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ schema_version: 1, official_accuracy_eligible: true, public_picks_enabled: false, records: [] })
  }));
  await openOct9(page);
  await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(8);
  await expect(page.locator('#jcm-watch-panel .jcm-status.unverified')).toHaveCount(0);
});
test('mobile: watchlist readable, popup usable and no horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await openOct9(page);
  await expect(page.locator('#jcm-watch-panel .jcm-status.win')).toHaveCount(6);
  await expect(page.locator('#jcm-watch-panel .jcm-status.loss')).toHaveCount(1);
  await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(1);
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(width.document, 'Mobile page must not overflow horizontally').toBeLessThanOrEqual(width.viewport);
  await page.locator('#jcm-watch-panel .jcm-row').first().click();
  await expect(page.locator('#jcm-detail-overlay')).toHaveClass(/open/);
  await expect(page.locator('#jcm-detail-overlay .jcm-close')).toBeVisible();
  await page.locator('#jcm-detail-overlay .jcm-close').click();
  await expect(page.locator('#jcm-detail-overlay')).not.toHaveClass(/open/);
  await context.close();
});

test('public status remains fail-closed and publication disabled', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:8765/data/status.json');
  expect(response.ok()).toBeTruthy();
  const status = await response.json();
  expect(status.automated_picks_enabled).toBe(false);
  expect(status.mode).toBe('awaiting_verified_data_provider');
});

test('320px phone keeps unverified watchlist accessible', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await openOct9(page);
  await expect(page.locator('#jcm-watch-panel .jcm-status.win')).toHaveCount(6);
  await expect(page.locator('#jcm-watch-panel .jcm-status.loss')).toHaveCount(1);
  await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(1);
  const metrics = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: document.documentElement.clientWidth,
    dateHeight: document.querySelector('#date').getBoundingClientRect().height
  }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.width);
  expect(metrics.dateHeight).toBeGreaterThanOrEqual(44);
  await page.locator('#jcm-watch-panel .jcm-row').first().click();
  await expect(page.locator('#jcm-detail-content')).toContainText('Betfair confirmed: 5th');
  const modal = await page.locator('#jcm-detail-overlay .jcm-modal').boundingBox();
  expect(modal).not.toBeNull();
  expect(modal.x).toBeGreaterThanOrEqual(0);
  expect(modal.x + modal.width).toBeLessThanOrEqual(321);
  await page.locator('#jcm-detail-overlay .jcm-close').click();
  await expect(page.locator('#jcm-detail-overlay')).not.toHaveClass(/open/);
  await context.close();
});

test('reduced-motion mobile date navigation preserves displayed metrics', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openOct9(page);
  const before = await snapshotMetrics(page);
  await page.locator('#date').selectOption('2026-10-08');
  await page.locator('#date').selectOption('2026-10-09');
  await expect(page.locator('#jcm-watch-panel .jcm-status.win')).toHaveCount(6);
  await expect(page.locator('#jcm-watch-panel .jcm-status.loss')).toHaveCount(1);
  await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(1);
  await expect.poll(() => snapshotMetrics(page)).toBe(before);
  await context.close();
});



test('confirmed winning horse renders Failure with Betfair link; missing horse stays Pending', async ({page}) => {
  await openOct9(page);
  const loss=page.locator('#jcm-watch-panel .jcm-row').filter({hasText:'Havana Touch'});
  await expect(loss).toContainText('1st');await expect(loss).toContainText('Failure');
  await loss.click();await expect(page.locator('#jcm-detail-content a')).toHaveAttribute('href','https://betting.betfair.com/horse-racing/results/09-october-2026/kempton-park/27/6/');
  await page.locator('#jcm-detail-overlay .jcm-close').click();
  const missing=page.locator('#jcm-watch-panel .jcm-row').filter({hasText:'Forty Years On'});
  await expect(missing).toContainText('Pending');await expect(missing).not.toContainText('NR');
});
test('wrong date, non-Betfair source, outcome mismatch and duplicate evidence stay pending', async ({page,request}) => {
  const response=await request.get('http://127.0.0.1:8765/data/betfair-results.json');const feed=await response.json();
  const item=feed.records[0];
  for(const bad of [{...item,date:'2026-10-08'},{...item,result_source_url:'https://example.com/'},{...item,result_status:'LOSS'},null]){
    await page.route('**/data/betfair-results.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...feed,records:[bad]})}));
    await openOct9(page);await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(8);await page.unroute('**/data/betfair-results.json');
  }
  await page.route('**/data/betfair-results.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...feed,records:[item,item]})}));
  await openOct9(page);await expect(page.locator('#jcm-watch-panel .jcm-status.pending')).toHaveCount(8);
});
test('today retains all 15 horses, confidence and chronological order; rated totals include accepted outcomes', async ({page}) => {
 await page.clock.install({time:new Date('2026-10-12T23:59:00Z')});
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(15);
 await expect(page.locator('#jcm-official-panel .jcm-status.pending')).toHaveCount(0);
 const times=await page.locator('#jcm-official-panel .jcm-time').allTextContents();expect(times).toEqual([...times].sort());
 await page.locator('#jcm-official-panel .jcm-row').filter({hasText:'Kykorock'}).click();
 await expect(page.locator('#jcm-detail-content .jcm-confidence.high')).toContainText('85%');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await expect(page.locator('#jcm-rated-ratios')).toContainText('4 / 3');
});


test('12 October backfill uses uniform locked defaults and historical controls',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('#date').selectOption('2026-10-12');await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('[data-builder-row]')).toHaveCount(15);await expect(page.locator('#builder-amount-box')).toHaveCount(0);await expect(page.locator('[data-builder-balance]')).toHaveText('£905.54');await expect(page.locator('[data-builder-potential]')).toHaveText('£-94.46');await expect(page.locator('[data-builder-include]:enabled')).toHaveCount(0);
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('#builder-amount-box')).toHaveCount(0);await expect(page.locator('[data-builder-row="0"] [data-builder-liability-value]')).toHaveText('£500.00');await expect(page.locator('.builder-bank')).toContainText('£7,500.00');
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-liability="0"]')).toHaveValue('250');await expect(page.locator('[data-builder-liability="0"]')).toBeDisabled();
});

test('today picks survive delayed historical result refreshes', async ({ page }) => {
 await page.clock.install({time:new Date('2026-10-12T13:00:00Z')});
 let release;const gate=new Promise(resolve=>{release=resolve});let held=0;
 await page.route(/data\/(unverified-results|betfair-results)\.json/,async route=>{held++;await gate;await route.continue();});
 await page.goto('http://127.0.0.1:8765/#picks');
 await expect(page.locator('#date')).toHaveValue('2026-10-12');
 await expect(page.locator('[data-research-index]')).toHaveCount(15);
 await expect.poll(()=>held).toBe(2);
 const responses=Promise.all([page.waitForResponse(r=>r.url().endsWith('/unverified-results.json')),page.waitForResponse(r=>r.url().endsWith('/betfair-results.json'))]);
 release();await responses;
 await page.waitForLoadState('networkidle');
 await expect(page.locator('[data-research-index]')).toHaveCount(15);
 await expect(page.locator('#jcm-official-panel')).toContainText('Mighty Fleur');
 await page.locator('[data-research-index="0"]').click();
 await expect(page.locator('#jcm-detail-content')).toContainText('Mighty Fleur');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await page.locator('#date').selectOption('2026-10-09');
 await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('[data-research-index]')).toHaveCount(15);
});

test('today displays supplied Betfair outcomes without changing official accuracy', async ({page,request}) => {
 const response=await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-12.json');
 const data=await response.json();
 const rows=[...data.high_competition,...data.competition_watchlist];
 Object.assign(rows[0],{result_status:'WIN',placing:'2nd',result_source_url:'https://betting.betfair.com/horse-racing/results/12-october-2026/worcester/59/6/'});
 Object.assign(rows[1],{result_status:'LOSS',placing:'1st',result_source_url:'https://betting.betfair.com/horse-racing/results/12-october-2026/musselburgh/15/6/'});
 Object.assign(rows[2],{result_status:'WIN',placing:'3rd',result_source_url:'https://example.com/'});
 await page.route('**/data/competition-research-2026-10-12.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}));
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('[data-research-index]')).toHaveCount(15);
 const success=page.locator('[data-research-index]').filter({hasText:'Kykorock'});
 await expect(success).toContainText('Horse lost');
 await expect(page.locator('[data-research-index]').filter({hasText:'Kelpie Grey'})).toContainText('Horse won');
 await expect(page.locator('[data-research-index]').filter({hasText:'Methgal'})).toContainText('Pending');
 await success.click();
 await expect(page.locator('#jcm-detail-content')).toContainText('2nd');
 await expect(page.locator('#jcm-detail-content')).not.toContainText('Result source');
 expect(rows.every(r=>r.official_accuracy_eligible===false)).toBeTruthy();
});

test('accepted provider results populate picks, rating groups and fictional settlement',async({page})=>{
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('[data-research-index]')).toHaveCount(15);
 for(const name of ['Methgal','Indhaar','Lauderdale King','Tredegar Square','Kelpie Grey','Dandy Magic','Zoustar Dreams'])await expect(page.locator('[data-research-index]').filter({hasText:name})).toContainText('Horse lost');
 for(const name of ['One Of The Boys','Mighty Fleur','Kykorock'])await expect(page.locator('[data-research-index]').filter({hasText:name})).toContainText('Horse won');
 await expect(page.locator('[data-research-index]').filter({hasText:'Wadooda'})).toContainText('Horse won');
 await page.locator('[data-research-index]').filter({hasText:'Methgal'}).click();
 await expect(page.locator('#jcm-detail-content')).toContainText('3rd');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await expect.poll(()=>page.evaluate(()=>window.jcmRatedCounts?true:false)).toBeTruthy();
 const counts=await page.evaluate(async()=>window.jcmRatedCounts([await (await fetch('data/competition-research-2026-10-12.json')).json()]));
 expect(counts.high).toEqual({win:4,loss:1});expect(counts.medium).toEqual({win:4,loss:3});expect(counts.low).toEqual({win:2,loss:1});
 await page.evaluate(()=>window.jcmOpenDummyAccount());
 await expect(page.locator('#jcm-detail-content')).toContainText('One Of The Boys');
 await expect(page.locator('#jcm-detail-content')).toContainText('£905.54');
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');
});
test('provider identity mismatch remains pending',async({page,request})=>{
 const d=await (await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-12.json')).json();
 const r=d.high_competition.find(r=>r.horse==='Methgal');r.result_horse_id='';
 await page.route('**/data/competition-research-2026-10-12.json',route=>route.fulfill({json:d}));
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('[data-research-index]').filter({hasText:'Methgal'})).toContainText('Pending');
});


 test('mobile daily rate and reachable account close after scrolling', async ({page}) => {
 await page.setViewportSize({width:390,height:664});
 await page.clock.install({time:new Date('2026-10-12T21:00:00Z')});
 await page.goto('http://127.0.0.1:8765/#hub');
 await expect(page.locator('#jcm-daily-rate')).toContainText('66.7% success · 10/15 settled');
 const logo=await page.locator('.jcm-hub-mark').boundingBox();expect(logo.y).toBeGreaterThanOrEqual(24);expect(logo.y).toBeLessThan(60);
 await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('[data-builder-row]')).toHaveCount(15);
 await page.locator('.jcm-modal').evaluate(el=>el.scrollTop=el.scrollHeight);
 const close=page.locator('#jcm-detail-overlay .jcm-close');
 const box=await close.boundingBox();expect(box.y).toBeGreaterThanOrEqual(24);expect(box.y+box.height).toBeLessThan(664);
 await close.click();await expect(page.locator('#jcm-detail-overlay')).not.toHaveClass(/open/);
 await page.locator('[data-page="picks"]').click();await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('#jcm-official-panel .jcm-accuracy')).toContainText('66.7% success · 10/15 settled');
 });

test('result card shows selected outcome, finishing place, winner, margins and exact racecard',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('[data-research-index]').filter({hasText:'Wadooda'})).toContainText('Horse won');
 await expect.poll(()=>page.evaluate(async()=>{const d=await (await fetch('data/result-card-details-2026-10-12.json')).json();return d.details.length})).toBe(15);
 await page.locator('[data-research-index]').filter({hasText:'Wadooda'}).click();
 await expect(page.locator('.jcm-result-card')).toContainText('Finished 1st of 8');await expect(page.locator('.jcm-result-card')).toContainText('1.5 lengths');
 await expect(page.locator('.jcm-result-outcome.loss')).toHaveText('Horse won');
 await expect(page.getByRole('link',{name:'View this racecard'})).toHaveAttribute('href','https://www.sportinglife.com/racing/racecards/2026-10-12/kempton/racecard/942991/unibet-supports-safer-gambling-maiden-fillies-stakes-gbb-race?dcmp=SL_PLUS_CARDS');
 await expect(page.getByRole('link',{name:'View race videos here'})).toHaveAttribute('href','https://www.sportinglife.com/racing/results');
 const modal=await page.locator('.jcm-modal').boundingBox();expect(modal.width).toBeGreaterThanOrEqual(366);
 await page.locator('.jcm-close').first().click();await page.locator('[data-research-index]').filter({hasText:'Niffler'}).click();
 await expect(page.getByRole('link',{name:'View this racecard'})).toHaveAttribute('href','https://www.sportinglife.com/racing/racecards/2026-10-12/kempton/racecard/942995/try-unibets-new-improved-acca-boosts-handicap?dcmp=SL_PLUS_CARDS');
 await expect(page.locator('.jcm-result-card')).not.toContainText('https://www.racingpost.com/racecards/2026-10-12/');
});
test('individual provider URL must match result race ID',async({page,request})=>{
 await page.goto(URL);
 const d=await (await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-12.json')).json();
 const r=[...d.high_competition,...d.competition_watchlist].find(r=>r.horse==='Wadooda');
 expect(await page.evaluate(r=>window.jcmAcceptedResult(r),r)).toBe(true);
 for(const url of ['https://api.theracingapi.com/v1/results/rac_999',r.result_source_url+'?race=other',r.result_source_url+'#other'])expect(await page.evaluate(r=>window.jcmAcceptedResult(r),{...r,result_source_url:url})).toBe(false);
});

test('phone header: home, date and logo share one row with compact top clearance',async({page})=>{
 for(const width of [360,390]){
 await page.setViewportSize({width,height:844});await page.goto(URL);
 const boxes=await Promise.all(['header .identity img','#date','.jcm-home-link'].map(s=>page.locator(s).boundingBox()));
 const centers=boxes.map(b=>b.y+b.height/2);expect(Math.max(...centers)-Math.min(...centers)).toBeLessThan(2);
 expect(boxes[0].y).toBeGreaterThanOrEqual(16);expect(boxes[0].y).toBeLessThan(40);
 expect(boxes[2].x+boxes[2].width).toBeLessThanOrEqual(width);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
});

test('mobile result tiles group confidence, finish and winner details',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await page.waitForTimeout(300);
 await page.locator('[data-research-index]').filter({hasText:'Wadooda'}).click();
 await expect(page.locator('.jcm-result-top .jcm-confidence')).toContainText('Confidence');
 await expect(page.locator('.jcm-result-top')).not.toContainText('Confidence rating');
 await expect(page.locator('.jcm-result-summary')).toContainText('Finished 1st of 8');
 await expect(page.locator('.jcm-result-tile').filter({has:page.getByRole('heading',{name:'Race winner',exact:true})})).toContainText('Wadooda');
 await expect(page.locator('.jcm-result-card')).not.toContainText('Selected horse beaten by');
 const top=await page.locator('.jcm-result-top').evaluate(el=>el.scrollWidth<=el.clientWidth);expect(top).toBe(true);
 await page.locator('.jcm-close').first().click();await page.locator('[data-research-index]').filter({hasText:'Floating Market'}).click();
 const winner=page.locator('.jcm-result-tile').filter({has:page.getByRole('heading',{name:'Race winner',exact:true})});
 await expect(winner).toContainText('That Darn Cantor');await expect(winner).toContainText('2.25 lengths');
 await expect(page.locator('.jcm-result-summary')).toContainText('Horse lost');await expect(page.locator('.jcm-result-summary')).toContainText('Finished 3rd of 6');
 await expect(page.locator('.jcm-result-tile h3')).toHaveText(['Selected horse','Race winner','Reason for selection','Racecard','Race results','Race video']);
 await expect(page.getByRole('link',{name:'View this race result'})).toHaveAttribute('href','https://www.sportinglife.com/racing/results/2026-10-12/kempton/942994/try-unibets-superboosts-handicap');
 await expect(page.getByRole('link',{name:'View race videos here'})).toHaveAttribute('href','https://www.sportinglife.com/racing/results');
});

 test('Niffler winning result keeps provider identity and matching result card',async({page,request})=>{
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 const row=page.locator('[data-research-index]').filter({hasText:'Niffler'});await expect(row).toContainText('Horse won');
 await row.click();await expect(page.locator('.jcm-result-summary')).toContainText('Finished 1st of 9');
 await expect(page.locator('.jcm-result-card')).toContainText('0.75 lengths');
 await expect(page.locator('.jcm-result-card')).not.toContainText('Selected horse beaten by');
 const a=await (await request.get('http://127.0.0.1:8765/data/fictional-account-2026-10-12.json')).json();
 const r=a.rows.find(r=>r.horse==='Niffler');expect(r.result_status).toBe('LOSS');expect(r.official_accuracy_eligible).toBe(false);
 expect(r.result_race_id).toBe('rac_32300727667');expect(r.result_horse_id).toBe('hrs_62779360');
 expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,race_date:'2026-10-12'}),r)).toBe(true);
 });

 test('Sporting Life fallback requires matching race identity and completed evidence',async({page,request})=>{
 await page.goto(URL);
 const d=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-12.json')).json();
 const base=d.high_competition.find(r=>r.horse==='Floating Market');
 const r={...base,result_source:'SPORTING_LIFE',verification_status:'WEBSITE_CONFIRMED',result_website_race_id:'942994',result_source_url:'https://www.sportinglife.com/racing/results/2026-10-12/kempton/942994/try-unibets-superboosts-handicap'};
 expect(await page.evaluate(r=>window.jcmAcceptedResult(r),r)).toBe(true);
 for(const bad of [{result_website_race_id:'999'},{result_horse:'Different horse'},{result_date:'2026-10-11'},{verification_status:'UNVERIFIED'},{official_accuracy_eligible:true},{position:'UNKNOWN'},{result_source_url:r.result_source_url.replace('/kempton/','/newcastle/')}])expect(await page.evaluate(r=>window.jcmAcceptedResult(r),{...r,...bad})).toBe(false);
 });

 test('final two races and closing research totals agree across account views',async({page,request})=>{
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 for(const horse of ["Rory's Royale",'Edmond Halley']){const row=page.locator('[data-research-index]').filter({hasText:horse});await expect(row).toContainText('Horse lost');await row.click();await expect(page.locator('.jcm-result-summary')).toContainText('Finished 3rd');await page.locator('#jcm-detail-overlay .jcm-close').click();}
 const d=await(await request.get('http://127.0.0.1:8765/data/fictional-account-2026-10-12.json')).json();expect(d.rows.filter(r=>r.result_status==='WIN')).toHaveLength(10);expect(d.rows.filter(r=>r.result_status==='LOSS')).toHaveLength(5);expect(d.rows.some(r=>r.result_status==='PENDING')).toBe(false);
 await page.evaluate(()=>window.jcmOpenDummyAccount());await expect(page.locator('#jcm-detail-content')).toContainText('£905.54');await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');
 });

 test('confidence bands use 80 and 70 boundaries including a Low rating',async({page,request})=>{
 const d=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-12.json')).json();
 for(const [i,p] of [80,79,70,69].entries())d.high_competition[i].competition_confidence_percent=p;
 await page.route('**/data/competition-research-2026-10-12.json',route=>route.fulfill({json:d}));await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 for(const [i,tier] of ['high','medium','medium','low'].entries()){const row=page.locator('[data-research-index]').filter({hasText:d.high_competition[i].horse});await expect(row).toHaveClass(new RegExp('jcm-rating-'+tier));await row.click();await expect(page.locator('#jcm-detail-content .jcm-confidence')).toContainText(tier==='low'?'Low':tier==='high'?'High':'Medium');await page.locator('#jcm-detail-overlay .jcm-close').click();}
 await page.evaluate(()=>window.jcmOpenRatedPerformance());await expect(page.locator('.jcm-rated-table tbody tr')).toHaveCount(3);await expect(page.locator('.jcm-rated-table')).toContainText('Low');
 });

 test('overall research counters and clickable lists include all current outcomes',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});
 await page.goto(URL);await expect(page.locator('.metrics')).toHaveAttribute('data-overall-state','ready');
 const cards=page.locator('.metrics .metric');await expect(cards.nth(0)).toContainText('72.7%');await expect(cards.nth(0)).toContainText('16/22');await expect(cards.nth(1)).toContainText('16');await expect(cards.nth(2)).toContainText('6');
 await cards.nth(1).click();await expect(page.locator('.jcm-category-row')).toHaveCount(16);await expect(page.locator('#jcm-detail-content')).toContainText('Nostrum');await expect(page.locator('#jcm-detail-content')).toContainText("Rory's Royale");await page.locator('#jcm-detail-overlay .jcm-close').click();
 await cards.nth(2).click();await expect(page.locator('.jcm-category-row')).toHaveCount(6);await expect(page.locator('#jcm-detail-content')).toContainText('Niffler');
 });


test('13 October confirmed picks, colours, percentages and yesterday Low results',async({page,request})=>{
 await page.setViewportSize({width:390,height:844});await page.clock.install({time:new Date('2026-10-13T07:30:00Z')});
 await page.goto(URL);await expect(page.locator('#date')).toHaveValue('2026-10-13');
 await expect(page.locator('[data-research-index]')).toHaveCount(16);await expect(page.locator('.jcm-competition-watchlist')).toHaveCount(9);
 await expect(page.locator('[data-research-index] .jcm-confidence')).toHaveCount(0);await expect(page.locator('[data-research-index].jcm-rating-high')).toHaveCount(7);await expect(page.locator('[data-research-index].jcm-rating-medium')).toHaveCount(3);await expect(page.locator('[data-research-index].jcm-rating-low')).toHaveCount(6);
 const d=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();
 for(const r of [...d.high_competition,...d.competition_watchlist]){const row=page.locator('[data-research-index]').filter({hasText:r.horse});await expect(row).toContainText(r.off_time_uk);await expect(row).not.toContainText(r.competition_confidence_percent+'%');await expect(row).toContainText('Pending');}
 const orange=page.locator('[data-research-index]').filter({hasText:'Miss Denver'});expect(await orange.evaluate(e=>getComputedStyle(e).borderTopColor)).toBe('rgb(237, 189, 87)');
 await orange.click();await expect(page.locator('#jcm-detail-content')).toContainText('13 Oct 2026');await expect(page.locator('#jcm-detail-content .jcm-confidence')).toContainText('Low');await expect(page.getByRole('link',{name:'View this racecard'})).toHaveAttribute('href',/\/2026-10-13\/hereford\/racecard\/943157\//);await page.locator('#jcm-detail-overlay .jcm-close').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#date').selectOption('2026-10-12');await expect(page.locator('[data-research-index]')).toHaveCount(15);await expect(page.locator('[data-research-index] .jcm-confidence')).toHaveCount(0);await expect(page.locator('[data-research-index].jcm-rating-low')).toHaveCount(3);await expect(page.locator('#jcm-official-panel .jcm-accuracy')).toContainText('66.7%');
 await page.evaluate(()=>window.jcmOpenRatedPerformance());await expect(page.locator('.jcm-rated-table')).toContainText('Low');await expect(page.locator('.jcm-rated-table tbody tr').filter({hasText:'Low'})).toContainText('2 / 1');await page.locator('#jcm-detail-overlay .jcm-close').click();
 await page.locator('#date').selectOption('2026-10-09');await expect(page.locator('#jcm-watch-panel')).toBeVisible();await page.locator('#date').selectOption('2026-10-13');await expect(page.locator('[data-research-index]')).toHaveCount(16);await expect(page.locator('#jcm-watch-panel')).toBeHidden();await expect(page.locator('.metrics')).toContainText('72.7%');
});

test('13 October picks survive delayed history and racing date fetches',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T07:30:00Z')});
 let release;const gate=new Promise(r=>release=r);
 await page.route(/data\/(betfair-results|unverified-results)\.json/,async r=>{await gate;await r.continue()});
 await page.goto(URL);await expect(page.locator('[data-research-index]')).toHaveCount(16);release();await page.waitForLoadState('networkidle');await expect(page.locator('[data-research-index]')).toHaveCount(16);
 await page.route('**/data/competition-research-2026-10-12.json',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.continue()});
 await page.locator('#date').selectOption('2026-10-12');await page.locator('#date').selectOption('2026-10-13');await page.waitForLoadState('networkidle');await expect(page.locator('[data-research-index]')).toHaveCount(16);await expect(page.locator('#jcm-official-panel')).not.toContainText('Mighty Fleur');
});

async function builderFixture(page){await page.route('**/data/bet-builder-2026-10-13.json',async route=>{const r=await route.fetch(),d=await r.json();for(const row of d.rows){row.lay_odds=null;delete row.withdrawal_status;}await route.fulfill({json:d});});}
async function builderToday(page,style='fixed'){
 await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('[data-builder-row]')).toHaveCount(16);
 if(style!=='fixed'){await page.locator('[data-account-mode="'+style+'"]').click();if(style!=='results')await expect(page.locator('[data-builder-row]')).toHaveCount(16);}
}
async function builderOdds(page,i,value='3'){
 await page.locator('[data-builder-odds="'+i+'"]').fill(value);await page.locator('[data-builder-confirm-row="'+i+'"]').click();
}
test('builder locked defaults, daily redistribution, independent banks and saved exclusions',async({page})=>{
 await page.setViewportSize({width:360,height:780});await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});await builderFixture(page);await builderToday(page);
 await expect(page.getByRole('tab')).toHaveText(['£1000 a day','£500 a race','Manual betting','Results']);await expect(page.locator('#jcm-detail-content > :first-child')).toHaveClass(/builder-switch/);
 await expect(page.locator('[data-builder-balance]')).toHaveText('£1,000.00');await expect(page.locator('#builder-amount-box')).toHaveCount(0);await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');await expect(page.locator('[data-builder-potential]')).toHaveText('Unavailable');
 await page.locator('[data-builder-include="0"]').uncheck();await expect(page.locator('[data-builder-row="1"] [data-builder-liability-value]')).toHaveText('£66.67');
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('.builder-bank')).toContainText('£8,000.00');await expect(page.locator('[data-builder-reserved]')).toHaveText('£8,000.00');await expect(page.locator('#builder-amount-box')).toHaveCount(0);await expect(page.locator('[data-builder-row="1"] [data-builder-liability-value]')).toHaveText('£500.00');
 await page.locator('[data-builder-include="0"]').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£7,500.00');await builderOdds(page,1,'1.0001');await expect(page.locator('#builder-message')).toContainText('Enter decimal lay odds');await builderOdds(page,1,'3');
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await expect(page.locator('[data-builder-include="0"]')).not.toBeChecked();await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-include="0"]')).not.toBeChecked();await expect(page.locator('[data-builder-odds="1"]')).toHaveValue('3');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('manual amounts autosave on blur and Enter, remain independent, and reject unfunded liability',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£500.00');
 await page.locator('[data-builder-liability="0"]').fill('400');await page.locator('[data-builder-liability="0"]').press('Tab');await expect(page.locator('#builder-message')).toContainText('Race saved');await expect(page.locator('[data-builder-reserved]')).toHaveText('£650.00');
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-liability="0"]')).toHaveValue('400');
 await page.locator('[data-builder-liability="1"]').fill('5000');await page.locator('[data-builder-liability="1"]').press('Enter');await expect(page.locator('#builder-message')).toContainText('Insufficient available balance');
 await page.locator('[data-builder-liability="1"]').fill('350');await page.locator('[data-builder-liability="1"]').press('Enter');await expect(page.locator('[data-builder-reserved]')).toHaveText('£750.00');
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-liability="0"]')).toHaveValue('400');await expect(page.locator('[data-builder-liability="1"]')).toHaveValue('350');
});
function builderResult(r,win=true){return {...r,result_status:win?'WIN':'LOSS',position:win?'2':'1',result_source:'THE_RACING_API',verification_status:'PROVIDER_ACCEPTED',result_source_url:'https://api.theracingapi.com/v1/results?start_date=2026-10-13&end_date=2026-10-13',result_retrieved_at:'2026-10-13T20:00:00Z',result_date:r.race_date,result_off_dt:r.scheduled_off_dt,result_off_time_uk:r.off_time_uk,result_course:r.course,result_horse:r.horse,result_race_id:r.race_id,result_horse_id:r.horse_id,official_accuracy_eligible:false};}
test('untouched accounts backfill two completed dates for all three lines without any saved settings',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="results"]').click();
 await expect(page.locator('[data-strategy-dot]')).toHaveCount(6);await expect(page.locator('[data-strategy-dot][data-date="2026-10-14"]')).toHaveCount(0);await expect(page.locator('#jcm-detail-content')).toContainText(/backfilled/i);
 for(const [m,c] of Object.entries({fixed:'#edbd57',race:'#00bfc1',manual:'#ae90ff'}))await expect(page.locator('[data-strategy-line="'+m+'"]').first()).toHaveAttribute('stroke',c);
 await expect(page.locator('[data-strategy-dot="fixed"][data-date="2026-10-12"]')).toHaveAttribute('fill','#ff5776');await expect(page.locator('[data-strategy-dot="fixed"][data-date="2026-10-13"]')).toHaveAttribute('fill','#ff5776');
 await page.locator('#builder-results-day').selectOption('2026-10-12');await expect(page.locator('#jcm-detail-content')).toContainText('£905.54');expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('jcm-builder-v3')).length)).toBe(0);
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot]')).toHaveCount(6);
});
test('pending and mismatched results or missing odds prevent closes but do not block following daily bank',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await builderFixture(page);await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await expect(page.locator('[data-builder-balance]')).toHaveText('£1,000.00');await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot][data-date="2026-10-13"]')).toHaveCount(0);await expect(page.locator('#jcm-detail-content')).toContainText('pending results or missing data');
 await page.unroute('**/data/bet-builder-2026-10-13.json');const d=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();d.high_competition[0].result_horse_id='hrs_WRONG';await page.route('**/data/competition-research-2026-10-13.json',r=>r.fulfill({json:d}));await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot][data-date="2026-10-13"]')).toHaveCount(0);
});
test('default races lock individually; green/red bulk exclusions persist and leave locked liability',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T12:44:00Z')});await builderToday(page,'race');await expect(page.locator('[data-builder-include]:checked')).toHaveCount(15);await expect(page.locator('[data-builder-reserved]')).toHaveText('£7,500.00');
 const box=page.locator('[data-builder-include="0"]');expect(await box.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(20, 121, 76)');await page.clock.fastForward(61*1000);await expect(box).toBeDisabled();await expect(page.locator('[data-builder-odds="0"]')).toBeDisabled();await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£500.00');await expect(page.locator('[data-builder-include]:checked')).toHaveCount(1);expect(await page.locator('[data-builder-include="1"]').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(169, 35, 61)');
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£500.00');await page.locator('#builder-select-all').check();await expect(page.locator('[data-builder-reserved]')).toHaveText('£7,500.00');
});
test('old settings are preserved separately; invalid new override is rejected without fabricated history',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.evaluate(()=>localStorage.setItem('jcm-builder-v2-2026-10-14-manual','legacy-preserved'));await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£500.00');await page.locator('[data-builder-liability="0"]').fill('400');await page.locator('[data-builder-liability="0"]').press('Enter');
 await page.evaluate(()=>{const k='jcm-builder-v3-2026-10-14-manual',s=JSON.parse(localStorage.getItem(k));s.entries[Object.keys(s.entries)[0]].confirmed_at='2026-10-14T20:00:00Z';localStorage.setItem(k,JSON.stringify(s));});await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('#jcm-detail-content')).toContainText('INSUFFICIENT VERIFIED DATA');expect(await page.evaluate(()=>localStorage.getItem('jcm-builder-v2-2026-10-14-manual'))).toBe('legacy-preserved');
});
test('builder timers stop on close and cannot overwrite a horse detail popup',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T12:44:00Z')});await builderToday(page,'race');await page.locator('#jcm-detail-overlay .jcm-close').click();await page.locator('[data-page="picks"]').click();await page.locator('[data-research-index]').filter({hasText:'Miss Denver'}).click();await expect(page.locator('.jcm-result-card')).toBeVisible();await page.clock.fastForward(70*1000);await expect(page.locator('.jcm-result-card')).toBeVisible();await expect(page.locator('[data-builder-row]')).toHaveCount(0);
});

test('all 13 October selections show recovered reasons with counterarguments and provenance',async({page})=>{
 await page.setViewportSize({width:360,height:780});
 await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});
 await page.goto('http://127.0.0.1:8765/#picks');
 await page.locator('#date').selectOption('2026-10-13');
 await expect(page.locator('[data-research-index]')).toHaveCount(16);
 for(let i=0;i<16;i++){
  const row=page.locator('[data-research-index]').nth(i);
  const horse=await row.locator('.jcm-horse').innerText();
  await row.click();
  const tile=page.locator('.jcm-result-tile').filter({has:page.locator('h3',{hasText:'Reason for selection'})});
  await expect(page.locator('.jcm-result-card h2')).toHaveText(horse);
  await expect(tile).toContainText('Counterargument');
  await expect(tile).toContainText('Main challengers');
  await expect(tile).toContainText('underlying source data not reverified');
  await expect(tile).not.toContainText('Selection reason not supplied.');
  await page.locator('#jcm-detail-overlay .jcm-close').click();
 }
 await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('[data-research-index]')).toHaveCount(15);
 await page.locator('[data-research-index]').first().click();
 await expect(page.locator('.jcm-result-card')).toBeVisible();
});

async function openDrift(page){
 await page.setViewportSize({width:360,height:780});
 await page.clock.install({time:new Date('2026-10-13T11:00:00Z')});
 await page.goto('http://127.0.0.1:8765/#hub');
 await page.addStyleTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.css'});await page.addScriptTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.js'});await page.evaluate(()=>window.jcmOpenDriftingOdds());
 await expect(page.locator('#jcm-drift-overlay')).toHaveClass(/open/);
 await expect(page.locator('[data-drift-race]')).toHaveCount(38);
}
test('Drifting / Shortening Tracker shows all race leaders, historical coverage and blocked execution',async({page})=>{
 await openDrift(page);
 await expect(page.locator('#drift-title')).toHaveText('Drifting / Shortening Tracker');
 await expect(page.locator('#drift-content')).toContainText('Betfair Exchange only');
 await expect(page.locator('#drift-content')).toContainText('back/lay side unknown');
 await expect(page.locator('#drift-content')).toContainText('113/149');
 await expect(page.locator('#drift-content')).toContainText('no executable opportunities qualified');
 await expect(page.locator('#drift-content')).toContainText('Similar opening prices (±25%)');
 await expect(page.locator('[data-drift-race]').filter({hasText:'Koffee And Kale'})).toHaveCount(0);
 await page.locator('#drift-filter').selectOption('DRIFT');
 const rows=page.locator('[data-drift-race]');await expect(rows).toHaveCount(0);
 await expect(page.locator('#drift-content')).toContainText('No comparable rows for this view');
 const width=await page.locator('.drift-modal').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));
 expect(width.scroll).toBeLessThanOrEqual(width.client+1);
 await page.locator('.drift-modal').evaluate(e=>e.scrollTop=e.scrollHeight);
 const close=await page.locator('#jcm-drift-overlay .jcm-close').boundingBox();
 expect(close.y).toBeGreaterThanOrEqual(0);expect(close.y+close.height).toBeLessThanOrEqual(780);
 await page.locator('#jcm-drift-overlay .jcm-close').click();await expect(page.locator('#jcm-drift-overlay')).not.toHaveClass(/open/);
});
test('latest Exchange capture is append-only and remains blocked research',async({request})=>{
 const response=await request.get('http://127.0.0.1:8765/data/drifting-odds-2026-10-13.json');expect(response.ok()).toBe(true);
 const data=await response.json(),latest=data.observations.at(-1);expect(data.latest_observation_at).toBe('2026-10-13T22:08:51.332Z');
 expect(data.observations).toHaveLength(7);expect(latest.rows).toHaveLength(38);
 expect(latest.completion_status).toBe('END_OF_DAY_ARCHIVAL_CAPTURE_ALL_RACES_OFF');
 const counts=latest.rows.reduce((out,row)=>{const key=row.current.direction||row.current.status;out[key]=(out[key]||0)+1;return out;},{});
 expect(counts).toEqual({STALE_OR_MISSING_CLOSE:38});
 for(const [index,row] of data.rows.entries()){
  expect(row.current).toEqual(latest.rows[index].current);expect(row.current.source).toBe('The Racing API · Betfair Exchange');expect(row.current.price_side).toBe('UNSPECIFIED');
  expect(row.opportunity_status).toBe('BLOCKED_UNVERIFIED_EXECUTION_AND_UNVALIDATED_FORECAST');
 }
 const granlahan=data.rows.find(row=>row.horse==='Granlahan');
 expect(granlahan.withdrawal_status).toBe('EXPLICIT_NON_RUNNER');
 expect(granlahan.withdrawal_evidence.status).toBe('PROVIDER_ACCEPTED');
 expect(data.replacement_observations).toEqual([expect.objectContaining({withdrawn_horse:'Granlahan',status:'NOT_CAPTURED_PROSPECTIVELY',replacement_horse:null})]);
});
test('14 October morning cohort preserves ties, Exchange-only evidence and blocked qualification',async({request})=>{
 const manifest=await(await request.get('http://127.0.0.1:8765/data/drifting-odds-days.json')).json();
 expect(manifest.days).toContain('2026-10-14');
 const response=await request.get('http://127.0.0.1:8765/data/drifting-odds-2026-10-14.json');expect(response.ok()).toBe(true);
 const data=await response.json();expect(data.rows).toHaveLength(45);expect(new Set(data.rows.map(row=>row.race_id)).size).toBe(39);
 expect(data.coverage).toEqual(expect.objectContaining({race_count:39,leader_count:45,current_valid_pairs:38,current_missing_pairs:7,requested_past_starts:225,returned_past_starts:178,usable_past_comparisons:145}));
 const counts=data.rows.reduce((out,row)=>{const key=row.current.direction||'MISSING_PAIR';out[key]=(out[key]||0)+1;return out;},{});
 expect(counts).toEqual({DRIFT:17,UNCHANGED:8,SHORTENED:13,MISSING_PAIR:7});
 for(const row of data.rows){
  expect(row.current.source).toBe('The Racing API · Betfair Exchange');expect(row.current.price_side).toBe('UNSPECIFIED');
  expect(row.opportunity_status).toBe('BLOCKED_UNVERIFIED_EXECUTION_AND_UNVALIDATED_FORECAST');
  for(const prior of row.past){expect(prior.source).toBe('The Racing API · Betfair Exchange');expect(prior.price_side).toBe('UNSPECIFIED');}
 }
});
test('screenshot date archive preserves unknown capture times and reported comparison',async({page})=>{
 await openDrift(page);await page.locator('[data-drift-tab="screenshots"]').click();
 await expect(page.locator('[data-drift-screenshot]')).toHaveCount(16);
 await expect(page.locator('[data-drift-screenshot]').filter({hasText:'Koffee And Kale'})).toContainText('NR · excluded');
 await expect(page.locator('#drift-content')).toContainText('Capture time unknown');
 await page.locator('#drift-date').selectOption('2026-10-12');
 await expect(page.locator('[data-drift-screenshot]')).toHaveCount(15);
 await expect(page.locator('#drift-content')).toContainText('Mighty Fleur');
 await expect(page.locator('#drift-content')).toContainText(/hedged profit unavailable/i);
 await expect(page.locator('#drift-content')).toContainText('2.62');
});
test('same-market hedge calculator handles both directions, commission, adverse moves and invalid prices',async({page})=>{
 await openDrift(page);await page.locator('[data-drift-tab="calculator"]').click();
 await page.locator('#drift-entry').fill('3');await page.locator('#drift-exit').fill('2');
 await expect(page.locator('#drift-hedge-result')).toContainText('£150.00');
 await expect(page.locator('#drift-hedge-result')).toContainText('£47.50');
 await page.locator('#drift-order').selectOption('lay');
 await page.locator('#drift-entry').fill('2');await page.locator('#drift-exit').fill('3');
 await expect(page.locator('#drift-hedge-result')).toContainText('£66.67');
 await expect(page.locator('#drift-hedge-result')).toContainText('£31.66');
 await expect(page.locator('#drift-hedge-result')).toContainText('£100.00');
 await page.locator('#drift-entry').fill('3');await page.locator('#drift-exit').fill('2');
 await expect(page.locator('#drift-hedge-result .drift-negative')).toContainText('-£50.00');
 await page.locator('#drift-order').selectOption('back');
 await page.locator('#drift-entry').fill('2');await page.locator('#drift-exit').fill('3');
 await expect(page.locator('#drift-hedge-result .drift-negative')).toContainText('-£33.34');
 await page.locator('#drift-exit').fill('1');await expect(page.locator('#drift-hedge-result')).toContainText('odds of at least 1.01');
 await page.locator('#drift-exit').fill('2');await page.locator('#drift-commission').fill('101');
 await expect(page.locator('#drift-hedge-result')).toContainText('valid commission');
});
test('missing odds data fails closed and preserves horse popup navigation',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T11:00:00Z')});
 await page.route('**/data/drifting-odds-2026-10-13.json',route=>route.fulfill({status:500,body:'Unavailable'}));
 await page.goto('http://127.0.0.1:8765/#hub');await page.addStyleTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.css'});await page.addScriptTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.js'});await page.evaluate(()=>window.jcmOpenDriftingOdds());
 await expect(page.locator('#drift-content')).toContainText('INSUFFICIENT VERIFIED DATA');
 await expect(page.locator('[data-drift-race]')).toHaveCount(0);
 await page.locator('#jcm-drift-overlay .jcm-close').click();
 await page.locator('[data-page="picks"]').click();await page.locator('[data-research-index]').first().click();
 await expect(page.locator('.jcm-result-card')).toBeVisible();
});

test('13 October accepted Miss Denver result reaches overview, detail and per-race settlement',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T12:44:00Z')});
 await builderToday(page,'race');
 await page.clock.fastForward(32*60*1000);await page.locator('[data-account-mode="race"]').click();
 await expect(page.locator('[data-builder-row="0"]')).toContainText('Result: Horse lost');
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£7,000.00');
 await expect(page.locator('[data-builder-balance]')).toHaveText('£8,027.78');
 await page.locator('#jcm-detail-overlay .jcm-close').click();await page.locator('[data-page="picks"]').click();await page.locator('#date').selectOption('2026-10-13');
 await page.reload();await page.locator('#date').selectOption('2026-10-13');
 await expect(page.locator('.metrics .metric').first()).toContainText('17/23');
 const row=page.locator('[data-research-index]').filter({hasText:'Miss Denver'});await expect(row).toContainText('Horse lost');await row.click();
 await expect(page.locator('.jcm-result-card')).toContainText('Finished 2nd of 5');await expect(page.locator('.jcm-result-card')).toContainText('Blue Topaz');
 const data=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();
 const selected=data.competition_watchlist.find(r=>r.horse==='Miss Denver');
 expect(selected.official_accuracy_eligible).toBe(false);expect(selected.screenshot_result_evidence.result_source).toBe('BETFAIR_EXCHANGE_USER_SCREENSHOT');
 expect(await page.evaluate(r=>window.jcmAcceptedResult(r),selected)).toBe(true);
 expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,result_source_url:'https://api.theracingapi.com/v1/results/rac_999'}),selected)).toBe(false);
});

test('13 October full API results replace partial screenshot evidence without upgrading official accuracy',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T14:20:00Z')});
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-13');
 await expect(page.locator('.metrics .metric').first()).toContainText('18/25');
 for(const expected of [
  {horse:'Chantilly Wings',status:'Horse lost',finish:'Finished 6th of 11',winner:'Build A Bridge',source:'rac_32300969792'},
  {horse:'Four Springs',status:'Horse won',finish:'Finished 1st of 4',winner:'Four Springs',source:'rac_32300882627'}
 ]){
  const row=page.locator('[data-research-index]').filter({hasText:expected.horse});await expect(row).toContainText(expected.status);await row.click();
  await expect(page.locator('.jcm-result-card')).toContainText(expected.finish);await expect(page.locator('.jcm-result-card')).toContainText(expected.winner);await page.locator('#jcm-detail-overlay .jcm-close').click();
 }
 const data=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();
 for(const selected of [...data.high_competition,...data.competition_watchlist].filter(r=>['Chantilly Wings','Four Springs'].includes(r.horse))){
  expect(selected.official_accuracy_eligible).toBe(false);expect(selected.verification_status).toBe('PROVIDER_ACCEPTED');expect(selected.screenshot_result_evidence.result_source).toBe('BETFAIR_EXCHANGE_USER_SCREENSHOT');
  expect(selected.position).toBe(selected.horse==='Chantilly Wings'?'6':'1');expect(selected.result_field_size).toBe(selected.horse==='Chantilly Wings'?11:4);
  expect(selected.result_source_url).toBe('https://api.theracingapi.com/v1/results/'+selected.result_race_id);expect(await page.evaluate(r=>window.jcmAcceptedResult(r),selected)).toBe(true);
 }
});


for(const source of ['The Racing API · Bet365',null]){
 test('tracker rejects non-Exchange or unidentified price source '+source,async({page})=>{
  await page.clock.install({time:new Date('2026-10-13T11:00:00Z')});
  await page.route('**/data/drifting-odds-2026-10-13.json',async route=>{const response=await route.fetch();const d=await response.json();d.rows[0].current.source=source;await route.fulfill({json:d});});
  await page.goto('http://127.0.0.1:8765/#hub');await page.addStyleTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.css'});await page.addScriptTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.js'});await page.evaluate(()=>window.jcmOpenDriftingOdds());
  await expect(page.locator('#drift-content')).toContainText('INSUFFICIENT VERIFIED DATA');
  await expect(page.locator('[data-drift-race]')).toHaveCount(0);
 });
}

test('provider pulled-up and explicit NR outcomes settle, unknown codes stay pending', async ({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T18:00:00Z')});await page.goto(URL);await page.locator('#date').selectOption('2026-10-13');
 const data=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();
 const dream=data.high_competition.find(r=>r.horse==='Dream Diamond'),nr=data.high_competition.find(r=>r.horse==='Granlahan');
 expect(await page.evaluate(r=>window.jcmAcceptedResult(r),dream)).toBe(true);
 expect(await page.evaluate(r=>window.jcmAcceptedResult(r),nr)).toBe(true);
 expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,position:'UNKNOWN'}),dream)).toBe(false);
 expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,result_non_runners:[]}),nr)).toBe(false);
 expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,result_status:'LOSS'}),dream)).toBe(false);
 await expect(page.locator('[data-research-index]').filter({hasText:'Dream Diamond'})).toContainText('Horse lost');
 await expect(page.locator('[data-research-index]').filter({hasText:'Granlahan'})).toContainText('NR');
});

test('Luminaries provider result updates overview, detail and account data', async ({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T17:00:00Z')});await page.goto(URL);await page.locator('#date').selectOption('2026-10-13');
 const row=page.locator('[data-research-index]').filter({hasText:'Luminaries'});await expect(row).toContainText('Horse won');await row.click();
 await expect(page.locator('.jcm-result-card')).toContainText('Finished 1st of 6');await expect(page.locator('.jcm-result-card')).toContainText('Luminaries');
 const research=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();
 const account=await(await request.get('http://127.0.0.1:8765/data/bet-builder-2026-10-13.json')).json();
 const selected=research.high_competition.find(r=>r.horse==='Luminaries'),settled=account.rows.find(r=>r.horse==='Luminaries');
 for(const result of [selected,settled]){expect(result.result_status).toBe('LOSS');expect(result.position).toBe('1');expect(result.result_field_size).toBe(6);expect(result.official_accuracy_eligible).toBe(false);expect(await page.evaluate(r=>window.jcmAcceptedResult(r),result)).toBe(true);}
});

test('Zachary Hickes winner settles as Horse won across the app and account', async ({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T18:33:00Z')});await page.goto(URL);await page.locator('#date').selectOption('2026-10-13');
 const row=page.locator('[data-research-index]').filter({hasText:'Zachary Hickes'});await expect(row).toContainText('Horse won');await row.click();
 await expect(page.locator('.jcm-result-card')).toContainText('Finished 1st of 7');await expect(page.locator('.jcm-result-card')).toContainText('Zachary Hickes');
 const research=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();
 const account=await(await request.get('http://127.0.0.1:8765/data/bet-builder-2026-10-13.json')).json();
 const detail=await(await request.get('http://127.0.0.1:8765/data/result-card-details-2026-10-13.json')).json();
 const selected=research.competition_watchlist.find(r=>r.horse==='Zachary Hickes'),settled=account.rows.find(r=>r.horse==='Zachary Hickes'),card=detail.details.find(r=>r.horse==='Zachary Hickes');
 for(const result of [selected,settled]){expect(result.result_status).toBe('LOSS');expect(result.position).toBe('1');expect(result.result_field_size).toBe(7);expect(result.official_accuracy_eligible).toBe(false);expect(await page.evaluate(r=>window.jcmAcceptedResult(r),result)).toBe(true);}
 expect(card).toMatchObject({position:'1',field_size:7,winner:'Zachary Hickes',winning_margin_lengths:1,selected_beaten_lengths:0});
});

test('13 October closes with two final winners and an explicit non-runner', async ({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T21:45:00Z')});await page.goto(URL);await page.locator('#date').selectOption('2026-10-13');
 const research=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();
 const account=await(await request.get('http://127.0.0.1:8765/data/bet-builder-2026-10-13.json')).json();
 const detail=await(await request.get('http://127.0.0.1:8765/data/result-card-details-2026-10-13.json')).json();
 const selections=[...research.high_competition,...research.competition_watchlist],counts=selections.reduce((out,row)=>{out[row.result_status]=(out[row.result_status]||0)+1;return out;},{});
 expect(counts).toEqual({LOSS:6,NR:2,WIN:8});
 for(const expected of [{horse:'Koffee And Kale',status:'NR',position:'NR',field:12},{horse:'Coxy’s Star',status:'LOSS',position:'1',field:10},{horse:'Midnight Media',status:'LOSS',position:'1',field:11}]){
  const selected=selections.find(r=>r.horse===expected.horse),settled=account.rows.find(r=>r.horse===expected.horse),card=detail.details.find(r=>r.horse===expected.horse);
  for(const result of [selected,settled]){expect(result.result_status).toBe(expected.status);expect(result.position).toBe(expected.position);expect(result.result_field_size).toBe(expected.field);expect(result.official_accuracy_eligible).toBe(false);expect(await page.evaluate(r=>window.jcmAcceptedResult(r),result)).toBe(true);}
  expect(card).toMatchObject({position:expected.position,field_size:expected.field});
  await expect(page.locator('[data-research-index]').filter({hasText:expected.horse})).toContainText(expected.status==='NR'?'NR':'Horse won');
 }
});

test('14 October publishes only agreed unrated picks and preserves final 13 October totals',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});
 await page.setViewportSize({width:390,height:844});await page.goto(URL);
 await expect(page.locator('#date')).toHaveValue('2026-10-14');
 await expect(page.locator('[data-research-index]')).toHaveCount(2);
 await expect(page.locator('#jcm-official-panel')).not.toContainText('Fast Track Harry');
 for(const expected of [{horse:'Il Est Francais',time:'16:38',reason:'Three consecutive pulled-up'},{horse:'Gingerbred',time:'17:13',reason:'202-day absence'}]){
  const row=page.locator('[data-research-index]').filter({hasText:expected.horse});await expect(row).toContainText(expected.time);await expect(row).toContainText('Pending');await row.click();
  await expect(page.locator('#jcm-detail-content')).toContainText('Not rated');await expect(page.locator('#jcm-detail-content')).toContainText(expected.reason);await expect(page.locator('#jcm-detail-content')).toContainText('Counterargument');
  await page.locator('#jcm-detail-overlay .jcm-close').click();
 }
 await expect(page.locator('.metrics')).toHaveAttribute('data-overall-state','ready');
 expect(await page.evaluate(()=>window.jcmOverallCounts)).toEqual({wins:24,losses:12,nr:2,total:36});
 await expect(page.locator('.metrics')).toContainText('66.7%');
 await page.locator('#date').selectOption('2026-10-13');await expect(page.locator('[data-research-index]')).toHaveCount(16);await expect(page.locator('#jcm-official-panel')).toContainText('57.1% success');
 await expect(page.locator('[data-research-index] .jcm-status.win')).toHaveCount(8);await expect(page.locator('[data-research-index] .jcm-status.loss')).toHaveCount(6);await expect(page.locator('[data-research-index] .jcm-status.nr')).toHaveCount(2);
});

test('14 October screenshot quotes populate all builder strategies and tracker',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-14T09:00:00Z')});
 await page.setViewportSize({width:390,height:844});await page.goto(URL+'#hub');
 await page.locator('[data-page="dummy-account"]').click();
 for(const style of ['fixed','race','manual']){
  await page.locator('[data-account-mode="'+style+'"]').click();
  await expect(page.locator('[data-builder-row]')).toHaveCount(2);
  for(const [i,horse,price,liquidity] of [[0,'Il Est Francais','4.2','£11.00'],[1,'Gingerbred','2.22','£26.00']]){
   const row=page.locator('[data-builder-row="'+i+'"]');await expect(row).toContainText(horse);await expect(row.locator('[data-builder-odds]')).toHaveValue(price);await expect(row).toContainText('Displayed liquidity: '+liquidity);await expect(row).toContainText('Pending');
  }
 }
 await page.locator('#jcm-detail-overlay .jcm-close').click();await page.addStyleTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.css'});await page.addScriptTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.js'});await page.evaluate(()=>window.jcmOpenDriftingOdds());await page.locator('[data-drift-tab="screenshots"]').click();
 await expect(page.locator('[data-drift-screenshot]')).toHaveCount(2);await expect(page.locator('[data-drift-screenshot]').first()).toContainText('08:49');
 const d=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-14.json')).json();
 expect(d.high_competition.map(r=>r.morning_market.best_lay)).toEqual([3.95,2.3]);
 expect(d.high_competition.map(r=>r.market_observations.at(-1).lay_odds)).toEqual([4.2,2.22]);
});

test('a month of untouched published cards produces all three trends without stored confirmations',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});
 const template=await(await request.get('http://127.0.0.1:8765/data/bet-builder-2026-10-14.json')).json();const dates=Array.from({length:30},(_,i)=>'2026-09-'+String(i+1).padStart(2,'0'));
 await page.route('**/data/bet-builder-days.json',r=>r.fulfill({json:{schema_version:1,days:dates.filter(d=>d!=='2026-09-15')}}));
 await page.route(/\/data\/(bet-builder|competition-research)-2026-09-\d{2}\.json$/,r=>{
  const date=r.request().url().match(/2026-09-\d{2}/)[0],rows=template.rows.map((row,i)=>{const dt=date+'T'+row.off_time_uk+':00+01:00';return {...row,race_date:date,scheduled_off_dt:dt,result_status:i?'LOSS':'WIN',position:i?'1':'2',result_source:'THE_RACING_API',verification_status:'PROVIDER_ACCEPTED',result_source_url:'https://api.theracingapi.com/v1/results?start_date='+date+'&end_date='+date,result_retrieved_at:date+'T20:00:00Z',result_date:date,result_off_dt:dt,result_off_time_uk:row.off_time_uk,result_course:row.course,result_horse:row.horse,result_race_id:row.race_id,result_horse_id:row.horse_id,official_accuracy_eligible:false};});
  r.fulfill({json:r.request().url().includes('competition-research')?{schema_version:1,date,high_competition:rows,competition_watchlist:[]}:{...template,date,introduced_at:date+'T07:00:00Z',rows}});
 });
 await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot]')).toHaveCount(87);await expect(page.locator('.builder-table-wrap tbody tr')).toHaveCount(3);await expect(page.locator('#builder-results-day option')).toHaveCount(29);await expect(page.locator('[data-calendar-day]')).toHaveCount(30);await expect(page.locator('[data-strategy-dot][data-date="2026-09-15"]')).toHaveCount(0);for(const m of ['fixed','race','manual'])await expect(page.locator('[data-strategy-line="'+m+'"] polyline')).toHaveCount(2);await expect(page.locator('.builder-month-nav')).toContainText('September');expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('jcm-builder-v3')).length)).toBe(0);
});

test('daily metrics reconcile liability percentage returns and retain NR refunds',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="results"]').click();
 await expect(page.locator('.builder-results-table thead th')).toHaveText(['Theory','Stake','Returns','Percentage']);
 const cell=(day,strategy)=>page.locator('[data-results-day="'+day+'"] [data-results-strategy="'+strategy+'"]');
 for(const [day,m,staked,returned,percentage] of [['2026-10-12','fixed','£1,000.00','£905.54','-9.45%'],['2026-10-12','race','£7,500.00','£6,791.53','-9.45%'],['2026-10-12','manual','£3,750.00','£3,395.75','-9.45%'],['2026-10-13','fixed','£933.33','£723.20','-22.51%'],['2026-10-13','race','£7,000.00','£5,423.80','-22.52%'],['2026-10-13','manual','£3,500.00','£2,711.90','-22.52%']]){
  await page.locator('#builder-results-day').selectOption(day);await expect(cell(day,m).locator('[data-result-staked]')).toHaveText(staked);await expect(cell(day,m).locator('[data-result-returned]')).toHaveText(returned);await expect(cell(day,m).locator('[data-result-percentage]')).toHaveText(percentage);
 }
 await expect(page.locator('#builder-chart')).toHaveAttribute('aria-label',/percentage return/);await expect(page.locator('#builder-chart')).not.toContainText('£8507');await expect(page.locator('#builder-chart [data-percentage-axis]').first()).toContainText('%');await expect(page.locator('[data-break-even]')).toHaveCount(0);
 expect(Number(await page.locator('[data-strategy-dot="race"][data-date="2026-10-13"]').getAttribute('data-percentage'))).toBeCloseTo(-157620/700000*100,8);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const tableFit=await page.locator('.builder-table-wrap').evaluate(e=>({scroll:e.scrollWidth,width:e.clientWidth,cells:[...e.querySelectorAll('th,td')].map(c=>({text:c.textContent,width:c.clientWidth,scroll:c.scrollWidth}))}));expect(tableFit.scroll,JSON.stringify(tableFit)).toBeLessThanOrEqual(tableFit.width+1);await expect(cell('2026-10-13','manual')).toBeVisible();
});
test('zero included stakes have N/A percentage without inventing returns',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-builder-potential]')).toHaveText('£0.00');await page.clock.fastForward(10*60*60*1000);await page.locator('[data-account-mode="results"]').click();
 const cell=page.locator('[data-results-day="2026-10-14"] [data-results-strategy="fixed"]');await expect(cell.locator('[data-result-staked]')).toHaveText('£0.00');await expect(cell.locator('[data-result-returned]')).toHaveText('£0.00');await expect(cell.locator('[data-result-percentage]')).toHaveText('N/A');await expect(page.locator('[data-strategy-dot="fixed"][data-date="2026-10-14"]')).toHaveCount(0);await expect(page.locator('#builder-chart')).not.toHaveAttribute('viewBox',/NaN/);
});
test('all three potential winnings boxes incorporate live accepted losses and NR without changing defaults',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});const card=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-14.json')).json();let phase=0;
 await page.route('**/data/competition-research-2026-10-14.json',route=>{const d=structuredClone(card);for(const r of d.high_competition)r.result_status='PENDING';if(phase)for(const [i,r] of d.high_competition.entries()){if(i===1&&phase===1)continue;Object.assign(r,{result_status:i?'NR':'LOSS',position:i?'NR':'1',result_non_runners:i?[r.horse]:[],result_source:'THE_RACING_API',verification_status:'PROVIDER_ACCEPTED',result_source_url:'https://api.theracingapi.com/v1/results/'+r.race_id,result_retrieved_at:i?'2026-10-14T16:15:00Z':'2026-10-14T15:39:00Z',result_date:r.race_date,result_off_dt:r.scheduled_off_dt,result_off_time_uk:r.off_time_uk,result_course:r.course,result_horse:r.horse,result_race_id:r.race_id,result_horse_id:r.horse_id,official_accuracy_eligible:false});}return route.fulfill({json:d});});
 await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();for(const [m,amount] of [['fixed','£537.78'],['race','£537.78'],['manual','£268.89']]){await page.locator('[data-account-mode="'+m+'"]').click();await expect(page.locator('[data-builder-potential]')).toHaveText(amount);await expect(page.locator('#builder-amount-box')).toHaveCount(0);}
 phase=1;await page.clock.fastForward(8*60*60*1000);await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-potential]')).toHaveText('£-110.66');await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-potential]')).toHaveText('£-55.33');
 phase=2;await page.clock.fastForward(60*60*1000);await page.locator('[data-account-mode="fixed"]').click();await expect(page.locator('[data-builder-potential]')).toHaveText('£-500.00');await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-potential]')).toHaveText('£-250.00');
});

for(const size of [{width:390,height:844},{width:360,height:640}])test('compact results fit phone '+size.width+'x'+size.height+' with three separate trends and day navigation',async({page})=>{
 await page.setViewportSize(size);await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await expect(page.locator('.builder-potential h3')).toHaveText('Profit / Loss Calculator');await page.locator('[data-account-mode="results"]').click();await expect(page.locator('.builder-results-table tbody tr')).toHaveCount(3);await expect(page.locator('[data-shared-plot]')).toHaveCount(1);await expect(page.locator('[data-strategy-lane]')).toHaveCount(0);await expect(page.locator('[data-chart-legend]')).toHaveCount(1);await expect(page.locator('[data-strategy-line]')).toHaveCount(3);await expect(page.locator('#builder-results-day')).toHaveValue('2026-10-13');await page.locator('[data-results-prev]').click();await expect(page.locator('#builder-results-day')).toHaveValue('2026-10-12');await page.locator('[data-results-next]').click();await expect(page.locator('#builder-results-day')).toHaveValue('2026-10-13');await expect(page.locator('.builder-results-help')).toHaveCount(0);
 const dim=await page.locator('.jcm-modal').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth}));expect(dim.scroll).toBeLessThanOrEqual(dim.height+2);expect(dim.scrollWidth).toBeLessThanOrEqual(dim.width+1);
 const ys=await page.locator('[data-strategy-dot][data-date="2026-10-12"]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('cy'))));expect(Math.max(...ys)-Math.min(...ys)).toBeLessThan(.1);
 const date=await page.locator('.builder-results-date').boundingBox(),table=await page.locator('.builder-results-table').boundingBox();expect(date.y).toBeLessThan(table.y);
});

test('monthly calendar navigation shows blanks, leap years and exact observed percentage bounds',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="results"]').click();
 await expect(page.locator('[data-calendar-day]')).toHaveCount(31);await expect(page.locator('[data-calendar-day]').first()).toHaveText('1st');await expect(page.locator('[data-calendar-day]').last()).toHaveText('31st');await expect(page.locator('[data-strategy-dot]')).toHaveCount(6);
 const bounds=await page.locator('#builder-chart').evaluate(e=>({min:Number(e.dataset.min),max:Number(e.dataset.max),values:[...e.querySelectorAll('[data-percentage]')].map(p=>Number(p.dataset.percentage))}));expect(bounds.min).toBe(Math.min(...bounds.values));expect(bounds.max).toBe(Math.max(...bounds.values));
 await page.locator('[data-month-prev]').click();await expect(page.locator('[data-calendar-day]')).toHaveCount(30);await expect(page.locator('[data-strategy-dot]')).toHaveCount(0);await expect(page.locator('.builder-no-results')).toBeVisible();await page.locator('[data-month-next]').click();await expect(page.locator('[data-strategy-dot]')).toHaveCount(6);
 for(let i=0;i<32;i++)await page.locator('[data-month-prev]').click();await expect(page.locator('.builder-month-nav')).toContainText('February 2024');await expect(page.locator('[data-calendar-day]')).toHaveCount(29);
});
for(const width of [360,390])test('full racing date has space in all strategies at '+width,async({page})=>{
 await page.setViewportSize({width,height:844});await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();
 for(const m of ['fixed','race','manual']){await page.locator('[data-account-mode="'+m+'"]').click();const fit=await page.locator('#builder-day').evaluate(e=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),s=getComputedStyle(e);ctx.font=s.font;return {width:e.clientWidth,needed:ctx.measureText(e.selectedOptions[0].textContent).width+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)+20};});expect(fit.width).toBeGreaterThanOrEqual(fit.needed);}
});

test('shared graph uses ordinal angled days, a lower legend and unaltered percentages',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T08:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await expect(page.locator('#jcm-detail-content')).not.toContainText('Green = selected');await page.locator('[data-account-mode="results"]').click();
 await expect(page.locator('[data-shared-plot]')).toHaveCount(1);await expect(page.locator('[data-chart-legend]')).toContainText('£1000 a day');await expect(page.locator('[data-legend-strategy]')).toHaveCount(3);
 for(const [n,label] of [[1,'1st'],[2,'2nd'],[3,'3rd'],[11,'11th'],[12,'12th'],[13,'13th'],[21,'21st'],[22,'22nd'],[23,'23rd'],[31,'31st']]){const tick=page.locator('[data-calendar-day="2026-10-'+String(n).padStart(2,'0')+'"]');await expect(tick).toHaveText(label);await expect(tick).toHaveAttribute('transform',/rotate\(45\)/);}
 const positions=await page.locator('#builder-chart').evaluate(e=>{const axis=e.querySelector('[data-calendar-day]').getBBox(),legend=e.querySelector('[data-chart-legend]').getBoundingClientRect(),day=e.querySelector('[data-calendar-day]').getBoundingClientRect();return {legend:legend.top,day:day.bottom};});expect(positions.legend).toBeGreaterThan(positions.day);
 const ys=await page.locator('[data-strategy-dot][data-date="2026-10-13"]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('cy'))));expect(Math.max(...ys)-Math.min(...ys)).toBeLessThan(.1);
 const dash=await page.locator('[data-strategy-line] polyline').evaluateAll(es=>es.map(e=>e.getAttribute('stroke-dasharray')));expect(new Set(dash).size).toBe(3);
 await expect(page.locator('#jcm-detail-content')).not.toContainText('How these figures work');await page.locator('#jcm-detail-overlay .jcm-close').click();await page.addStyleTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.css'});await page.addScriptTag({url:'http://127.0.0.1:8765/scripts/drifting-odds.js'});await page.evaluate(()=>window.jcmOpenDriftingOdds());await expect(page.locator('#drift-content')).not.toContainText('Exploratory');await expect(page.locator('#drift-content')).toContainText('API proxy');
});

 test('Roundup replaces paused tiles with readable daily theory and learnings',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T11:00:00Z')});
 await page.setViewportSize({width:360,height:640});await page.goto('http://127.0.0.1:8765/#hub');
 await expect(page.locator('[data-page="test-1"],[data-page="drifting-odds"]')).toHaveCount(0);
 await page.locator('[data-page="roundup"]').click();
 await expect(page.locator('#roundup-date')).toHaveValue('2026-10-14');
 await expect(page.locator('.roundup-box h3')).toHaveText(['Theory','Learnings']);
 await expect(page.locator('#roundup-content')).toContainText('one non-winner from two selections: 50%');
 expect(await page.locator('.roundup-box p').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(18);
 expect(await page.locator('.roundup-modal').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('#jcm-roundup-overlay')).not.toHaveClass(/open/);
 });

test('14 October accepted results reconcile picks details default closes and Roundup',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-14T19:00:00Z')});
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8765/#picks');
 await page.locator('#date').selectOption('2026-10-14');
 await expect(page.locator('#jcm-official-panel')).toContainText('50% success');
 const rows=page.locator('[data-research-index]');await expect(rows).toHaveCount(2);
 await expect(rows.nth(0)).toContainText('Horse lost');await expect(rows.nth(1)).toContainText('Horse won');
 await rows.nth(0).click();await expect(page.locator('.jcm-result-finish')).toHaveText('Finished 5th of 8');await expect(page.locator('#jcm-detail-content')).toContainText('13.25 lengths');await page.keyboard.press('Escape');
 await rows.nth(1).click();await expect(page.locator('.jcm-result-finish')).toHaveText('Finished 1st of 7');await expect(page.locator('#jcm-detail-content')).toContainText('3.75 lengths');await page.keyboard.press('Escape');
 const p=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-14.json')).json(),b=await(await request.get('http://127.0.0.1:8765/data/bet-builder-2026-10-14.json')).json();
 for(const r of p.high_competition){expect(r.official_accuracy_eligible).toBe(false);expect(await page.evaluate(r=>window.jcmAcceptedResult(r),r)).toBe(true);expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,result_horse:'Wrong'}),r)).toBe(false);const a=b.rows.find(x=>x.race_id===r.race_id);for(const k of Object.keys(r).filter(k=>k.startsWith('result_')))expect(a[k]).toEqual(r[k]);}
 await page.evaluate(()=>window.jcmOpenBuilderStrategy('fixed'));await expect(page.locator('[data-builder-balance]')).toHaveText('£648.44');
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-balance]')).toHaveText('£4,648.44');
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-balance]')).toHaveText('£4,824.22');
 await page.locator('[data-account-mode="results"]').click();await expect(page.locator('#builder-results-day')).toHaveValue('2026-10-14');await expect(page.locator('[data-strategy-dot][data-date="2026-10-14"]')).toHaveCount(3);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('jcm-builder-v3')).length)).toBe(0);
});

test('15 October picks keep reasoning and history usable with Today’s Plan',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T10:40:00Z')});
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8765/#hub');
 await expect(page.locator('[data-page="picks"] strong')).toHaveText('Lay Bets');
 await expect(page.locator('[data-page="roundup"] strong')).toHaveText('Today’s Plan');
 await page.locator('[data-page="roundup"]').click();
 await expect(page.locator('#roundup-title')).toHaveText('Today’s Plan');
 await expect(page.locator('#roundup-date')).toHaveValue('2026-10-15');
 await expect(page.locator('.roundup-box').first()).toContainText('one screenshot and one race at a time');
 await expect(page.locator('.roundup-box').last()).toContainText('7 WIN / 1 LOSS');
 await page.locator('#roundup-date').selectOption('2026-10-14');
 await expect(page.locator('#roundup-content')).toContainText('one non-winner from two selections: 50%');
 await page.keyboard.press('Escape');
 await page.locator('[data-page="picks"]').click();
 await expect(page.locator('#date')).toHaveValue('2026-10-15');
 await expect(page.locator('[data-manual-index] .jcm-horse')).toHaveText(['Roman Spring','Moltophino','Motazzen','I Wish You','Magnolia','Cosmic Girl','Minella Marathon','Deep Sleep','Roi du Risk','Kado Sacree','Uncle Remus']);
 for(const [i,name] of ['Roman Spring','Moltophino','Motazzen'].entries()){
  await page.locator('[data-manual-index="'+i+'"]').click();
  await expect(page.locator('#jcm-detail-content')).toContainText(name);
  await expect(page.locator('#jcm-detail-content')).toContainText('Reason for selection');
  await expect(page.locator('#jcm-detail-content')).toContainText('Counterargument');
  await expect(page.locator('#jcm-detail-content')).toContainText('Source: Betfair user screenshot');
  await expect(page.locator('.jcm-result-tile h3')).toHaveText(['Selected horse','Race winner','Reason for selection','Recorded lay price','Racecard','Race results','Race video']);
  await expect(page.locator('.jcm-result-finish')).toHaveText('Pending');
  await expect(page.getByRole('link',{name:'View this racecard ↗'})).toHaveAttribute('href',/sportinglife\.com\/racing\/racecards\/2026-10-15\//);
  await expect(page.getByRole('link',{name:'View race videos here'})).toHaveAttribute('href','https://www.sportinglife.com/racing/results');
  await expect(page.locator('.jcm-result-card')).toContainText('Exact race result link not yet verified.');
  expect(await page.locator('.jcm-modal').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.locator('#jcm-detail-overlay .jcm-close').click();
 }
 await page.locator('#date').selectOption('2026-10-14');
 await page.locator('[data-research-index="0"]').click();
 await expect(page.locator('#jcm-detail-content')).toContainText('Il Est Francais');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await page.locator('#date').selectOption('2026-10-15');
 await expect(page.locator('[data-manual-index]')).toHaveCount(11);
});


test('today cards retain pending outcomes and reject mismatched racecard metadata',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T10:50:00Z')});
 await page.route('**/data/result-card-details-2026-10-15.json',async route=>{
  const response=await route.fetch(),data=await response.json();
  data.details.forEach(d=>{d.horse='Wrong horse';d.results_url='https://example.com/result';});
  await route.fulfill({response,json:data});
 });
 await page.goto(URL);
 await expect(page.locator('[data-manual-index]')).toHaveCount(11);
 await page.locator('[data-manual-index="0"]').click();
 await expect(page.locator('.jcm-result-outcome')).toHaveText('Pending');
 await expect(page.locator('.jcm-result-card')).toContainText('Exact racecard link not verified.');
 await expect(page.locator('.jcm-result-card a[href*="example.com"]')).toHaveCount(0);
 await expect(page.locator('.jcm-result-card')).toContainText('Performance 51');
});

test('15 October Bet Builder matches the three Lay Bets and preserves separate strategy settings',async({page})=>{
 await page.route('**/data/bet-builder-2026-10-15.json',async route=>{const response=await route.fetch(),data=await response.json();data.rows=data.rows.slice(0,3);delete data.expansion_from_keys;await route.fulfill({response,json:data});});
 await page.clock.install({time:new Date('2026-10-15T11:15:00Z')});
 await page.goto('http://127.0.0.1:8765/#hub');
 await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('#builder-day')).toHaveValue('2026-10-15');
 await expect(page.locator('.builder-row>strong')).toHaveText(['Roman Spring','Moltophino','Motazzen']);
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£333.34','£333.33','£333.33']);
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');
 await expect(page.locator('[data-builder-potential]')).toHaveText('£172.16');
 await expect(page.locator('[data-builder-odds="0"]')).toHaveValue('6.6');
 await expect(page.locator('[data-builder-odds="1"]')).toHaveValue('8');
 await expect(page.locator('[data-builder-odds="2"]')).toHaveValue('5.5');
 await expect(page.locator('.builder-row').first()).toContainText('Displayed liquidity: Unavailable');
 await page.locator('[data-builder-include="2"]').uncheck();
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£500.00','£500.00','£0.00']);
 await page.locator('[data-builder-include="2"]').check();
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£333.34','£333.33','£333.33']);
 await page.locator('[data-account-mode="race"]').click();
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£500.00','£500.00','£500.00']);
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,500.00');
 await page.locator('[data-account-mode="manual"]').click();
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£250.00','£250.00','£250.00']);
 await page.locator('[data-builder-liability="0"]').fill('100');
 await page.locator('[data-builder-confirm-row="0"]').click();
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£600.00');
 await page.locator('[data-account-mode="fixed"]').click();
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');
 await page.locator('[data-account-mode="manual"]').click();
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£100.00','£250.00','£250.00']);
});

test('15 October matched results preserve all five picks, three locked builder rows and source evidence',async({page,request})=>{
 await page.route('**/data/bet-builder-2026-10-15.json',async route=>{const response=await route.fetch(),data=await response.json();data.rows=data.rows.slice(0,3);delete data.expansion_from_keys;await route.fulfill({response,json:data});});
 await page.clock.install({time:new Date('2026-10-15T13:30:00Z')});
 await page.setViewportSize({width:390,height:844});await page.goto(URL);await page.locator('#date').selectOption('2026-10-15');
 await expect(page.locator('[data-manual-index]')).toHaveCount(11);
 await expect(page.locator('#jcm-official-panel')).toContainText('66.7% success · 2/3 settled');
 const labels=['Horse won','Horse lost','Horse lost','Pending','Pending','Pending','Pending','Pending'];
 for(let i=0;i<8;i++)await expect(page.locator('[data-manual-index="'+i+'"] .jcm-status')).toHaveText(labels[i]);
 for(const [i,finish] of [[0,'Finished 1st of 9'],[1,'Finished 3rd of 13'],[2,'Finished 2nd of 5']]){
  await page.locator('[data-manual-index="'+i+'"]').click();await expect(page.locator('.jcm-result-finish')).toHaveText(finish);
  await expect(page.locator('.jcm-result-card')).toContainText('Counterargument');expect(await page.locator('.jcm-modal').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.keyboard.press('Escape');
 }
 const p=await(await request.get('http://127.0.0.1:8765/data/manual-research-2026-10-15.json')).json();
 const b=await(await request.get('http://127.0.0.1:8765/data/bet-builder-2026-10-15.json')).json();
 expect(b.rows.slice(0,3).map(r=>r.lay_odds)).toEqual([6.6,8,5.5]);
 for(const r of p.selections.slice(0,3)){
  expect(r.official_accuracy_eligible).toBe(false);expect(r.result_source_url).toBe('https://api.theracingapi.com/v1/results/'+r.race_id);
  expect(await page.evaluate(r=>window.jcmAcceptedResult(r),r)).toBe(true);
  for(const change of [{result_horse:'Wrong'},{result_date:'2026-10-14'},{result_off_time_uk:'00:00'},{result_source_url:'https://api.theracingapi.com/v1/results/rac_1'},{result_retrieved_at:'2099-01-01T00:00:00Z'},{position:'NR'},{official_accuracy_eligible:true}]){
   expect(await page.evaluate(r=>window.jcmAcceptedResult(r),{...r,...change})).toBe(false);
  }
  const match=b.rows.find(x=>x.race_id===r.race_id);for(const k of Object.keys(r).filter(k=>k.startsWith('result_')))expect(match[k]).toEqual(r[k]);
 }
 await page.evaluate(()=>window.jcmOpenBuilderStrategy('fixed'));await expect(page.locator('[data-builder-balance]')).toHaveText('£782.27');await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£333.34','£333.33','£333.33']);
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-balance]')).toHaveText('£4,673.42');
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-balance]')).toHaveText('£4,836.71');
 await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot][data-date="2026-10-15"]')).toHaveCount(3);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('jcm-builder-v3')).length)).toBe(0);
});

test('15 October fallback retains the same accepted outcomes when JSON is unavailable',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T13:30:00Z')});
 await page.route('**/data/manual-research-2026-10-15.json',route=>route.abort());
 await page.goto(URL);await expect(page.locator('[data-manual-index]')).toHaveCount(11);
 await expect(page.locator('[data-manual-index="0"]')).toContainText('Horse won');
 await expect(page.locator('[data-manual-index="1"]')).toContainText('Horse lost');
 await expect(page.locator('[data-manual-index="2"]')).toContainText('Horse lost');
 await expect(page.locator('[data-manual-index="3"]')).toContainText('Pending');
 await expect(page.locator('[data-manual-index="4"]')).toContainText('Pending');
});

test('I Wish You unseat counts as lay win, retains reasoning and is not NR',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T14:00:00Z')});
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-15');
 await expect(page.locator('#jcm-official-panel')).toContainText('75% success · 3/4 settled');
 await expect(page.locator('[data-manual-index="3"]')).toContainText('Horse lost');
 await expect(page.locator('[data-manual-index="4"]')).toContainText('Pending');
 await page.locator('[data-manual-index="3"]').click();
 await expect(page.locator('.jcm-result-finish')).toHaveText('Unseated rider');
 await expect(page.locator('.jcm-result-card')).toContainText('180-day absence');
 await page.keyboard.press('Escape');
 await page.route('**/data/manual-research-2026-10-15.json',r=>r.abort());
 await page.reload();await expect(page.locator('#jcm-official-panel')).toContainText('75% success · 3/4 settled');
});

test('Magnolia verified website result counts as fourth lay win without losing later picks',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T14:30:00Z')});await page.goto(URL);
 await expect(page.locator('[data-manual-index]')).toHaveCount(11);
 await expect(page.locator('#jcm-official-panel')).toContainText('80% success · 4/5 settled');
 await expect(page.locator('[data-manual-index="4"]')).toContainText('Horse lost');
 await page.locator('[data-manual-index="4"]').click();await expect(page.locator('.jcm-result-finish')).toHaveText('3rd');
 await expect(page.locator('.jcm-result-card')).toContainText('sixth-ranked');await page.keyboard.press('Escape');
 await page.route('**/data/manual-research-2026-10-15.json',r=>r.abort());await page.reload();
 await expect(page.locator('#jcm-official-panel')).toContainText('80% success · 4/5 settled');
 await expect(page.locator('[data-manual-index="5"]')).toContainText('Pending');
 await expect(page.locator('[data-manual-index="6"]')).toContainText('Pending');
});

test('Cosmic Girl fourth settles fifth lay win with eight picks preserved',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T14:35:00Z')});await page.goto(URL);
 await expect(page.locator('[data-manual-index]')).toHaveCount(11);
 await expect(page.locator('#jcm-official-panel')).toContainText('83.3% success · 5/6 settled');
 await page.locator('[data-manual-index="5"]').click();await expect(page.locator('.jcm-result-finish')).toHaveText('4th');
 await expect(page.locator('.jcm-result-card')).toContainText('handicap debut');await page.keyboard.press('Escape');
 await page.route('**/data/manual-research-2026-10-15.json',r=>r.abort());await page.reload();
 await expect(page.locator('#jcm-official-panel')).toContainText('83.3% success · 5/6 settled');
 for(const i of [6,7])await expect(page.locator('[data-manual-index="'+i+'"]')).toContainText('Pending');
});


test('latest eight settled results and expanded builder separate realised and pending profit',async({page})=>{
 await page.clock.install({time:new Date('2026-10-15T15:11:00Z')});await page.goto(URL);
 await expect(page.locator('#jcm-official-panel')).toContainText('87.5% success · 7/8 settled');
 for(const [i,finish] of [[6,'2nd'],[7,'5th']]){await page.locator('[data-manual-index="'+i+'"]').click();await expect(page.locator('.jcm-result-finish')).toHaveText(finish);await page.keyboard.press('Escape');}
 await page.evaluate(()=>window.jcmOpenBuilderStrategy('fixed'));
 await expect(page.locator('[data-builder-row]')).toHaveCount(11);
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£90.91',...Array(9).fill('£90.91'),'£90.90']);
 await expect(page.locator('[data-builder-settled]')).toHaveText('£62.92');
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£272.72');
 await expect(page.locator('[data-builder-potential]')).toHaveText('£192.93');
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-settled]')).toHaveText('£346.01');
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-settled]')).toHaveText('£173.00');
 await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot][data-date="2026-10-15"]')).toHaveCount(0);
});

test('expanded card preserves existing device allocations and raw storage',async({page,request})=>{
 const c=await(await request.get('http://127.0.0.1:8765/data/bet-builder-2026-10-15-before-expansion.json')).json();
 const entries=Object.fromEntries(c.rows.map((r,i)=>[[r.off_time_uk,r.course,r.horse].join('|'),{included:true,liability_cents:i===0?33334:33333,odds:r.lay_odds,confirmed_at:null,default_entry:true}]));
 const saved={version:3,policy:'daily-defaults-20261014',date:c.date,mode:'fixed',amount_cents:100000,confirmed_at:null,entries,choices:Object.fromEntries(Object.keys(entries).map(k=>[k,true]))};
 await page.clock.install({time:new Date('2026-10-15T15:11:00Z')});await page.goto(URL);
 await page.evaluate(s=>localStorage.setItem('jcm-builder-v3-2026-10-15-fixed',JSON.stringify(s)),saved);
 await page.evaluate(()=>window.jcmOpenBuilderStrategy('fixed'));
 await expect(page.locator('[data-builder-row]')).toHaveCount(11);await expect(page.locator('[data-builder-settled]')).toHaveText('£-217.73');
 await expect(page.locator('[data-builder-liability-value]')).toHaveText(['£333.34','£333.33','£333.33',...Array(8).fill('£0.00')]);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jcm-builder-v3-2026-10-15-fixed')))).toEqual(saved);
});
