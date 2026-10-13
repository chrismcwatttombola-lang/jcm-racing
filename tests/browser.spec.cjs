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
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(15);
 await expect(page.locator('#jcm-official-panel .jcm-status.pending')).toHaveCount(0);
 const times=await page.locator('#jcm-official-panel .jcm-time').allTextContents();expect(times).toEqual([...times].sort());
 await page.locator('#jcm-official-panel .jcm-row').filter({hasText:'Kykorock'}).click();
 await expect(page.locator('#jcm-detail-content .jcm-confidence.high')).toContainText('85%');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await expect(page.locator('#jcm-rated-ratios')).toContainText('4 / 3');
});


test('fictional account redistributes confirmed liability and locks at first race', async ({ page }) => {
 await page.clock.install({time:new Date('2026-10-12T13:00:00Z')});
 await page.goto('http://127.0.0.1:8765/#hub');
 await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('[data-account-row]')).toHaveCount(15);
 await page.locator('[data-account-row="0"]').uncheck();
 await expect(page.locator('#jcm-detail-content')).toContainText('14 horses · £1,000.00 total liability');
 await page.locator('#jcm-account-budget').fill('2000');
 await expect(page.locator('#jcm-detail-content')).toContainText('14 horses · £1,000.00 total liability');
 await page.locator('#jcm-account-confirm').click();
 await expect(page.locator('#jcm-detail-content')).toContainText('14 horses · £2,000.00 total liability');
 await page.reload();
 await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('#jcm-account-budget')).toHaveValue('2000.00');
 await expect(page.locator('[data-account-row="0"]')).not.toBeChecked();
 await page.clock.fastForward(97*60*1000);
 await expect(page.locator('#jcm-account-confirm')).toBeDisabled();
 await expect(page.locator('[data-account-row="1"]')).toBeDisabled();
 await expect(page.locator('#jcm-account-lock')).toContainText('Locked for today');
});


test('phone: stake control is first and full liability stays on a single included horse', async ({ page }) => {
 await page.setViewportSize({width:390,height:844});
 await page.clock.install({time:new Date('2026-10-12T13:00:00Z')});
 await page.goto('http://127.0.0.1:8765/#hub');
 await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('#jcm-account-controls')).toBeVisible();
 await expect(page.locator('#jcm-best-selection')).not.toHaveAttribute('open','');
 await page.locator('#jcm-best-selection summary').click();
 await expect(page.locator('#jcm-best-selection')).toHaveAttribute('open','');
 await expect(page.locator('#jcm-best-selection')).toContainText('Wadooda');
 await expect(page.locator('[data-account-row]:checked')).toHaveCount(15);
 await expect(page.locator('#jcm-detail-content > :first-child')).toHaveClass(/jcm-account-switch/);await expect(page.locator('#jcm-detail-content > :nth-child(4)')).toHaveAttribute('id','jcm-account-controls');
 for(let i=1;i<15;i++)await page.locator('[data-account-row="'+i+'"]').uncheck();
 await expect(page.locator('#jcm-account-controls')).toContainText('Selected total liability: £1,000.00');
 await expect(page.locator('#jcm-detail-content')).toContainText('1 horses · £1,000.00 total liability');
 await page.locator('#jcm-account-budget').fill('4500');
 await page.locator('#jcm-account-confirm').click();
 await expect(page.locator('#jcm-account-controls')).toContainText('Selected total liability: £4,500.00');
 await expect(page.locator('#jcm-detail-content')).toContainText('Liability: £4,500.00');
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
 await expect(page.locator('#jcm-detail-content')).toContainText('£4,905.54');
 await expect(page.locator('#jcm-detail-content')).toContainText('Closing balance');
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
 await expect(page.locator('[data-account-row]')).toHaveCount(15);
 await page.locator('.jcm-modal').evaluate(el=>el.scrollTop=el.scrollHeight);
 const close=page.locator('#jcm-detail-overlay .jcm-close');
 const box=await close.boundingBox();expect(box.y).toBeGreaterThanOrEqual(24);expect(box.y+box.height).toBeLessThan(664);
 await close.click();await expect(page.locator('#jcm-detail-overlay')).not.toHaveClass(/open/);
 await page.locator('[data-page="picks"]').click();await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('#jcm-official-panel .jcm-accuracy')).toContainText('66.7% success · 10/15 settled');
 });

async function manualView(page){
 await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-manual-row]')).toHaveCount(4);
}
async function confirmManual(page,i,amount){
 await page.locator('[data-manual-include="'+i+'"]').check();await page.locator('[data-manual-amount="'+i+'"]').fill(amount);await page.locator('[data-manual-confirm="'+i+'"]').click();
}
test('manual: independent bank, funded reserves, persistence and individual scheduled locks',async({page})=>{
 await page.setViewportSize({width:390,height:664});await page.clock.install({time:new Date('2026-10-12T17:30:00Z')});
 await manualView(page);await expect(page.locator('#jcm-manual-bank')).toContainText('£5,000.00');
 await expect(page.locator('[data-manual-include]:checked')).toHaveCount(4);await expect(page.locator('#jcm-detail-content')).not.toContainText('Wadooda');
 await page.locator('[data-manual-include="0"]').check();await page.locator('[data-manual-amount="0"]').fill('1000');
 await expect(page.locator('[data-manual-reserved]')).toHaveText('£0.00');await page.locator('[data-manual-confirm="0"]').click();
 await expect(page.locator('[data-manual-reserved]')).toHaveText('£1,000.00');await expect(page.locator('[data-manual-available]')).toHaveText('£4,000.00');
 await confirmManual(page,1,'4500');await expect(page.locator('#jcm-manual-message')).toContainText('Insufficient available balance');await expect(page.locator('[data-manual-reserved]')).toHaveText('£1,000.00');
 await page.locator('[data-manual-include="0"]').uncheck();await page.locator('[data-manual-confirm="0"]').click();await expect(page.locator('[data-manual-available]')).toHaveText('£5,000.00');
 await confirmManual(page,0,'500');await confirmManual(page,1,'1000');
 await page.locator('[data-account-mode="fixed"]').click();await expect(page.locator('#jcm-account-budget')).toHaveValue('1000.00');
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-manual-reserved]')).toHaveText('£1,500.00');
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await expect(page.locator('[data-account-mode="fixed"]')).toHaveAttribute('aria-selected','true');
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-manual-amount="0"]')).toHaveValue('500');
 await page.clock.fastForward(45*60*1000+10);await expect(page.locator('[data-manual-confirm="0"]')).toBeDisabled();await expect(page.locator('[data-manual-confirm="1"]')).toBeEnabled();
 await confirmManual(page,1,'4000');await expect(page.locator('[data-manual-reserved]')).toHaveText('£4,500.00');
 await page.clock.fastForward(30*60*1000);await expect(page.locator('[data-manual-confirm="1"]')).toBeDisabled();await expect(page.locator('[data-manual-confirm="2"]')).toBeEnabled();
});
test('manual: accepted settlement moves only manual bank, missing evidence retains reserve',async({page})=>{
 await page.clock.install({time:new Date('2026-10-12T17:30:00Z')});let settled=false,won=false;
 await page.route('**/data/fictional-account-2026-10-12.json',async route=>{
 const r=await route.fetch(),d=await r.json();if(settled){
 const a=d.rows.find(r=>r.horse==='Floating Market');Object.assign(a,{result_status:won?'WIN':'LOSS',position:won?'2':'1',race_date:d.date,result_date:d.date,result_off_time_uk:a.off_time_uk,result_off_dt:'2026-10-12T19:15:00+01:00',result_course:a.course,result_horse:a.horse,result_source:'THE_RACING_API',verification_status:'PROVIDER_ACCEPTED',result_source_url:'https://api.theracingapi.com/v1/results?start_date=2026-10-12&end_date=2026-10-12',result_retrieved_at:'2026-10-12T18:16:00Z',result_race_id:'rac_123',result_horse_id:'hrs_123',official_accuracy_eligible:false});
 const b=d.rows.find(r=>r.horse==='Niffler');Object.assign(b,{result_status:'WIN',position:'2',result_source_url:null});
 }await route.fulfill({json:d});
 });
 await manualView(page);await confirmManual(page,0,'1000');await confirmManual(page,1,'500');
 settled=true;await page.clock.fastForward(46*60*1000);await page.reload();await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="manual"]').click();
 await expect(page.locator('[data-manual-balance]')).toHaveText('£4,000.00');await expect(page.locator('[data-manual-reserved]')).toHaveText('£500.00');await expect(page.locator('[data-manual-available]')).toHaveText('£3,500.00');
 await expect(page.locator('[data-manual-row="1"]')).toContainText('Result: PENDING');
 won=true;await page.reload();await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="manual"]').click();
 await expect(page.locator('[data-manual-balance]')).toHaveText('£5,413.04');await expect(page.locator('[data-manual-available]')).toHaveText('£4,913.04');
 await confirmManual(page,1,'5400');await expect(page.locator('[data-manual-available]')).toHaveText('£13.04');
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="manual"]').click();
 await expect(page.locator('[data-manual-balance]')).toHaveText('£5,413.04');await expect(page.locator('[data-manual-reserved]')).toHaveText('£5,400.00');
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
 await page.evaluate(()=>window.jcmOpenDummyAccount());await expect(page.locator('#jcm-detail-content')).toContainText('£4,905.54');await expect(page.locator('#jcm-detail-content')).toContainText('all 0 outstanding');
 });

 test('confidence bands use 80 and 70 boundaries including a Low rating',async({page,request})=>{
 const d=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-12.json')).json();
 for(const [i,p] of [80,79,70,69].entries())d.high_competition[i].competition_confidence_percent=p;
 await page.route('**/data/competition-research-2026-10-12.json',route=>route.fulfill({json:d}));await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 for(const [i,tier] of ['high','medium','medium','low'].entries()){const row=page.locator('[data-research-index]').filter({hasText:d.high_competition[i].horse});await expect(row).toHaveClass(new RegExp('jcm-rating-'+tier));await row.click();await expect(page.locator('#jcm-detail-content .jcm-confidence')).toContainText(tier==='low'?'Low':tier==='high'?'High':'Medium');await page.locator('#jcm-detail-overlay .jcm-close').click();}
 await page.evaluate(()=>window.jcmOpenRatedPerformance());await expect(page.locator('.jcm-rated-table tbody tr')).toHaveCount(3);await expect(page.locator('.jcm-rated-table')).toContainText('Low');
 });

 test('overall research counters and clickable lists include all current outcomes',async({page})=>{
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
test('builder today: top selector, daily redistribution, isolated race bank and persistence',async({page})=>{
 await page.setViewportSize({width:360,height:780});await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});await builderFixture(page);await builderToday(page);
 await expect(page.locator('#jcm-detail-content > :first-child')).toHaveClass(/builder-switch/);
 await expect(page.getByRole('tab')).toHaveText(['Stake Per Day','Stake Per Race','Manual Stakes','Results']);
 await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');
 await expect(page.locator('[data-builder-row="0"]')).toContainText('Miss Denver');await expect(page.locator('[data-builder-row="15"]')).toContainText('Midnight Media');
 await expect(page.locator('[data-builder-row="0"]')).toContainText('Potential net profit: Unavailable');
 await page.locator('[data-builder-include="0"]').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');await expect(page.locator('[data-builder-row="1"] [data-builder-liability-value]')).toHaveText('£66.67');
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');
 await page.locator('#builder-amount').fill('400');await page.locator('#builder-confirm').click();await expect(page.locator('#builder-message')).toContainText('Insufficient available balance');
 await page.locator('#builder-amount').fill('100');await page.locator('#builder-confirm').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,600.00');
 await page.locator('[data-builder-include="0"]').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,500.00');await expect(page.locator('[data-builder-row="1"] [data-builder-liability-value]')).toHaveText('£100.00');
 await builderOdds(page,1,'1.0001');await expect(page.locator('#builder-message')).toContainText('Enter decimal lay odds');await builderOdds(page,1,'3');await expect(page.locator('[data-builder-row="1"]')).toContainText('£47.50');
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await expect(page.locator('[data-account-mode="fixed"]')).toHaveAttribute('aria-selected','true');await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,500.00');await expect(page.locator('[data-builder-odds="1"]')).toHaveValue('3');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('builder today: per-race checkbox and odds lock independently; manual funds remain separate',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T12:30:00Z')});await builderFixture(page);await builderToday(page,'race');await page.locator('#builder-amount').fill('200');await page.locator('#builder-confirm').click();await builderOdds(page,0);
 await page.clock.fastForward(15*60*1000+10);await expect(page.locator('#builder-confirm')).toBeDisabled();await expect(page.locator('[data-builder-include="0"]')).toBeDisabled();await expect(page.locator('[data-builder-include="1"]')).toBeEnabled();await expect(page.locator('[data-builder-odds="0"]')).toBeDisabled();
 await page.locator('[data-builder-include="1"]').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£3,000.00');
 await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');await expect(page.locator('[data-builder-confirm-row="0"]')).toBeDisabled();
 await page.locator('[data-builder-include="1"]').check();await page.locator('[data-builder-liability="1"]').fill('5100');await builderOdds(page,1);await expect(page.locator('#builder-message')).toContainText('Insufficient available balance');
 await page.locator('[data-builder-liability="1"]').fill('500');await builderOdds(page,1);await expect(page.locator('[data-builder-reserved]')).toHaveText('£500.00');
 await page.locator('[data-builder-include="1"]').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');
 await page.locator('[data-account-mode="fixed"]').click();await expect(page.locator('#builder-confirm')).toBeDisabled();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,000.00');
});
function builderResult(r,win=true){return {...r,result_status:win?'WIN':'LOSS',position:win?'2':'1',result_source:'THE_RACING_API',verification_status:'PROVIDER_ACCEPTED',result_source_url:'https://api.theracingapi.com/v1/results?start_date=2026-10-13&end_date=2026-10-13',result_retrieved_at:'2026-10-13T20:00:00Z',result_date:r.race_date,result_off_dt:r.scheduled_off_dt,result_off_time_uk:r.off_time_uk,result_course:r.course,result_horse:r.horse,result_race_id:r.race_id,result_horse_id:r.horse_id,official_accuracy_eligible:false};}
test('builder settlements and results graph: all three independent closes, brand lines, directional dots, no future closes',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});const card=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();let settled=false;
 await page.route('**/data/competition-research-2026-10-13.json',route=>route.fulfill({json:settled?{...card,high_competition:card.high_competition.map(r=>builderResult(r)),competition_watchlist:card.competition_watchlist.map(r=>builderResult(r,r.horse!=='Miss Denver'))}:card}));
 await builderFixture(page);await builderToday(page);for(let i=0;i<16;i++)await builderOdds(page,i);await page.locator('[data-account-mode="race"]').click();await page.locator('#builder-amount').fill('100');await page.locator('#builder-confirm').click();for(let i=0;i<16;i++)await builderOdds(page,i);
 await page.locator('[data-account-mode="manual"]').click();await page.locator('[data-builder-include="0"]').check();await page.locator('[data-builder-liability="0"]').fill('1000');await builderOdds(page,0);
 await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot][data-date="2026-10-13"]')).toHaveCount(0);await expect(page.locator('#jcm-detail-content')).toContainText('£4,905.54');
 settled=true;await page.clock.fastForward(12*60*60*1000);await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot][data-date="2026-10-13"]')).toHaveCount(3);
 await expect(page.locator('[data-strategy-dot="manual"][data-date="2026-10-13"]')).toHaveAttribute('fill','#ff5776');await expect(page.locator('[data-strategy-dot="race"]')).toHaveAttribute('fill','#43bd84');await expect(page.locator('[data-strategy-dot="fixed"][data-date="2026-10-13"]')).toHaveAttribute('fill','#43bd84');
 await expect(page.locator('[data-strategy-line="fixed"]')).toHaveAttribute('stroke','#edbd57');await expect(page.locator('[data-strategy-line="race"]')).toHaveAttribute('stroke','#00bfc1');await expect(page.locator('[data-strategy-line="manual"]')).toHaveAttribute('stroke','#ae90ff');
 await expect(page.locator('#jcm-detail-content')).toContainText('£5,288.39');await expect(page.locator('#jcm-detail-content')).toContainText('£4,000.00');
 await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');await expect(page.locator('[data-builder-balance]')).toHaveText('£5,612.50');
});
test('builder fails closed on missing odds and wrong result identity; rejects corrupt saved choices',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});await builderFixture(page);await builderToday(page,'race');await page.locator('#builder-amount').fill('100');await page.locator('#builder-confirm').click();
 const card=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();await page.route('**/data/competition-research-2026-10-13.json',route=>route.fulfill({json:{...card,high_competition:card.high_competition.map(r=>builderResult(r)),competition_watchlist:card.competition_watchlist.map(r=>builderResult(r))}}));
 await page.clock.fastForward(12*60*60*1000);await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-balance]')).toHaveText('£5,000.00');await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,600.00');await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot="race"]')).toHaveCount(0);
 await page.evaluate(()=>{const k='jcm-builder-v2-2026-10-13-race',s=JSON.parse(localStorage.getItem(k));s.entries[Object.keys(s.entries)[0]].confirmed_at='2026-10-13T21:00:00Z';localStorage.setItem(k,JSON.stringify(s));});await page.locator('[data-account-mode="race"]').click();await expect(page.locator('#jcm-detail-content')).toContainText('INSUFFICIENT VERIFIED DATA');
});
test('builder screenshot prices: all active selections priced and withdrawn selection excluded',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});await builderToday(page);
 await expect(page.locator('[data-builder-include]:checked')).toHaveCount(15);
 await expect(page.locator('[data-builder-row]').filter({hasText:'Koffee And Kale'})).toContainText('Non-runner (Betfair screenshot)');
 await expect(page.locator('[data-builder-row]').filter({hasText:'Koffee And Kale'}).locator('[data-builder-include]')).toBeDisabled();
 await expect(page.locator('[data-builder-row]').filter({hasText:'English Time'}).locator('[data-builder-odds]')).toHaveValue('5.2');
 await expect(page.locator('[data-builder-row]').filter({hasText:'English Time'})).toContainText('£38.00');
 await expect(page.locator('[data-builder-row="0"] [data-builder-odds]')).toHaveValue('1.9');
 await expect(page.locator('[data-builder-row="0"]')).toContainText('Insufficient for full simulated stake');
 await page.locator('[data-account-mode="race"]').click();await page.locator('#builder-amount').fill('100');await page.locator('#builder-confirm').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,500.00');
});
test('builder carries yesterday saved bank and holds a mismatched race result',async({page,request})=>{
 await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});await builderFixture(page);await builderToday(page);
 await expect(page.locator('[data-builder-balance]')).toHaveText('£4,905.54');
 await page.locator('[data-account-mode="race"]').click();await page.locator('#builder-amount').fill('100');await page.locator('#builder-confirm').click();for(let i=0;i<16;i++)await builderOdds(page,i);
 const card=await(await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-13.json')).json();await page.route('**/data/competition-research-2026-10-13.json',route=>route.fulfill({json:{...card,high_competition:card.high_competition.map(r=>builderResult(r)),competition_watchlist:card.competition_watchlist.map(r=>({...builderResult(r),...(r.horse==='Miss Denver'?{result_horse_id:'hrs_999'}:{})}))}}));
 await page.clock.fastForward(12*60*60*1000);await page.locator('[data-account-mode="race"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£100.00');await expect(page.locator('[data-builder-row="0"]')).toContainText('Result: Pending');await page.locator('[data-account-mode="results"]').click();await expect(page.locator('[data-strategy-dot="race"]')).toHaveCount(0);
});
test('builder timers stop on close and cannot overwrite a horse detail popup',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T12:44:00Z')});await builderToday(page,'race');await page.locator('#jcm-detail-overlay .jcm-close').click();await page.locator('[data-page="picks"]').click();await page.locator('[data-research-index]').filter({hasText:'Miss Denver'}).click();await expect(page.locator('.jcm-result-card')).toBeVisible();await page.clock.fastForward(70*1000);await expect(page.locator('.jcm-result-card')).toBeVisible();await expect(page.locator('#jcm-detail-content')).toContainText('Selected horse');await expect(page.locator('[data-builder-row]')).toHaveCount(0);
});
test('all Bet Builder views: visible red/green boxes, default selections, atomic select-all and preserved choices',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T08:30:00Z')});await builderToday(page);
 for(const style of ['fixed','race','manual']){
 await page.locator('[data-account-mode="'+style+'"]').click();await expect(page.locator('[data-builder-row]')).toHaveCount(16);await expect(page.locator('[data-builder-include]:checked')).toHaveCount(15);await expect(page.locator('#builder-select-all')).toBeChecked();
 const checkbox=page.locator('[data-builder-include="0"]');expect(await checkbox.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(20, 121, 76)');expect((await checkbox.boundingBox()).width).toBeGreaterThanOrEqual(28);
 await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-builder-include]:checked')).toHaveCount(0);await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');expect(await checkbox.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(169, 35, 61)');
 await page.locator('#builder-select-all').check();await expect(page.locator('[data-builder-include]:checked')).toHaveCount(15);
 if(style==='race'){await page.locator('#builder-amount').fill('100');await page.locator('#builder-confirm').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,500.00');await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');await page.locator('#builder-select-all').check();await expect(page.locator('[data-builder-reserved]')).toHaveText('£1,500.00');}
 if(style==='manual'){await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');await page.locator('[data-builder-liability="0"]').fill('200');await page.locator('[data-builder-confirm-row="0"]').click();await expect(page.locator('[data-builder-reserved]')).toHaveText('£200.00');await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');}
 }
 await page.reload();await page.locator('[data-page="dummy-account"]').click();await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-builder-include]:checked')).toHaveCount(0);await expect(page.locator('[data-builder-reserved]')).toHaveText('£0.00');
});
test('select-all only changes editable races and keeps an already-started liability',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T12:44:00Z')});await builderToday(page,'race');await page.locator('#builder-amount').fill('100');await page.locator('#builder-confirm').click();await page.clock.fastForward(61*1000);
 await expect(page.locator('[data-builder-include="0"]')).toBeDisabled();await expect(page.locator('[data-builder-include="0"]')).toBeChecked();await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-builder-include]:checked')).toHaveCount(1);await expect(page.locator('[data-builder-reserved]')).toHaveText('£100.00');await page.locator('#builder-select-all').check();await expect(page.locator('[data-builder-include]:checked')).toHaveCount(15);
});
test('historical controls: select-all in daily and manual views changes no locked races',async({page})=>{
 await page.clock.install({time:new Date('2026-10-12T13:00:00Z')});await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="dummy-account"]').click();await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-account-row]:checked')).toHaveCount(0);await page.reload();await page.locator('[data-page="dummy-account"]').click();await expect(page.locator('[data-account-row]:checked')).toHaveCount(0);await page.locator('#builder-select-all').check();await expect(page.locator('[data-account-row]:checked')).toHaveCount(15);
 await page.clock.fastForward(5*60*60*1000);await page.locator('[data-account-mode="manual"]').click();await expect(page.locator('[data-manual-include]:checked')).toHaveCount(4);await page.locator('#builder-select-all').uncheck();await expect(page.locator('[data-manual-include]:checked')).toHaveCount(0);await page.locator('#builder-select-all').check();await expect(page.locator('[data-manual-include]:checked')).toHaveCount(4);await expect(page.locator('[data-manual-reserved]')).toHaveText('£0.00');await page.clock.fastForward(2*60*60*1000);await expect(page.locator('#builder-select-all')).toBeDisabled();
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
 await page.locator('[data-page="drifting-odds"]').click();
 await expect(page.locator('#jcm-drift-overlay')).toHaveClass(/open/);
 await expect(page.locator('[data-drift-race]')).toHaveCount(38);
}
test('Drifting Odds shows all race leaders, historical coverage and blocked execution',async({page})=>{
 await openDrift(page);
 await expect(page.locator('#drift-content')).toContainText('113/149');
 await expect(page.locator('#drift-content')).toContainText('No executable opportunities qualified');
 await expect(page.locator('[data-drift-race]').filter({hasText:'Koffee And Kale'})).toHaveCount(0);
 await page.locator('#drift-filter').selectOption('DRIFT');
 const rows=page.locator('[data-drift-race]');expect(await rows.count()).toBeGreaterThan(0);
 await expect(rows.first()).toContainText('DRIFT');
 const width=await page.locator('.drift-modal').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));
 expect(width.scroll).toBeLessThanOrEqual(width.client+1);
 await page.locator('.drift-modal').evaluate(e=>e.scrollTop=e.scrollHeight);
 const close=await page.locator('#jcm-drift-overlay .jcm-close').boundingBox();
 expect(close.y).toBeGreaterThanOrEqual(0);expect(close.y+close.height).toBeLessThanOrEqual(780);
 await page.locator('#jcm-drift-overlay .jcm-close').click();await expect(page.locator('#jcm-drift-overlay')).not.toHaveClass(/open/);
});
test('screenshot date archive preserves unknown capture times and reported comparison',async({page})=>{
 await openDrift(page);await page.locator('[data-drift-tab="screenshots"]').click();
 await expect(page.locator('[data-drift-screenshot]')).toHaveCount(16);
 await expect(page.locator('[data-drift-screenshot]').filter({hasText:'Koffee And Kale'})).toContainText('NR · excluded');
 await expect(page.locator('#drift-content')).toContainText('Capture time unknown');
 await page.locator('#drift-date').selectOption('2026-10-12');
 await expect(page.locator('[data-drift-screenshot]')).toHaveCount(15);
 await expect(page.locator('#drift-content')).toContainText('Mighty Fleur');
 await expect(page.locator('#drift-content')).toContainText('hedged profit unavailable');
 await expect(page.locator('#drift-content')).toContainText('2.62');
});
test('same-market hedge calculator handles both directions, commission, adverse moves and invalid prices',async({page})=>{
 await openDrift(page);await page.locator('[data-drift-tab="calculator"]').click();
 await page.locator('#drift-entry').fill('2');await page.locator('#drift-exit').fill('3');
 await expect(page.locator('#drift-hedge-result')).toContainText('£66.67');
 await expect(page.locator('#drift-hedge-result')).toContainText('£31.66');
 await page.locator('#drift-order').selectOption('lay');
 await page.locator('#drift-entry').fill('3');await page.locator('#drift-exit').fill('2');
 await expect(page.locator('#drift-hedge-result')).toContainText('£150.00');
 await expect(page.locator('#drift-hedge-result')).toContainText('£47.50');
 await expect(page.locator('#drift-hedge-result')).toContainText('£200.00');
 await page.locator('#drift-entry').fill('2');await page.locator('#drift-exit').fill('3');
 await expect(page.locator('#drift-hedge-result .drift-negative')).toContainText('-£33.34');
 await page.locator('#drift-exit').fill('1');await expect(page.locator('#drift-hedge-result')).toContainText('odds of at least 1.01');
 await page.locator('#drift-exit').fill('2');await page.locator('#drift-commission').fill('101');
 await expect(page.locator('#drift-hedge-result')).toContainText('valid commission');
});
test('missing odds data fails closed and preserves horse popup navigation',async({page})=>{
 await page.clock.install({time:new Date('2026-10-13T11:00:00Z')});
 await page.route('**/data/drifting-odds-2026-10-13.json',route=>route.fulfill({status:500,body:'Unavailable'}));
 await page.goto('http://127.0.0.1:8765/#hub');await page.locator('[data-page="drifting-odds"]').click();
 await expect(page.locator('#drift-content')).toContainText('INSUFFICIENT VERIFIED DATA');
 await expect(page.locator('[data-drift-race]')).toHaveCount(0);
 await page.locator('#jcm-drift-overlay .jcm-close').click();
 await page.locator('[data-page="picks"]').click();await page.locator('[data-research-index]').first().click();
 await expect(page.locator('.jcm-result-card')).toBeVisible();
});
