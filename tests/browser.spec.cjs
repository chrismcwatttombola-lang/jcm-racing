const { test, expect } = require('@playwright/test');
const URL = 'http://127.0.0.1:8765/#picks';
async function openOct9(page) {
  await page.goto(URL);
  await page.locator('#date').selectOption('2026-10-09');
  await expect(page.locator('#jcm-watch-panel')).toBeVisible();
}
async function snapshotMetrics(page) {
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
 await expect(page.locator('#jcm-official-panel .jcm-status.pending')).toHaveCount(4);
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
 await expect(page.locator('#jcm-detail-content > :nth-child(2)')).toHaveAttribute('id','jcm-account-controls');
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
 await expect(success).toContainText('Success');
 await expect(page.locator('[data-research-index]').filter({hasText:'Kelpie Grey'})).toContainText('Failure');
 await expect(page.locator('[data-research-index]').filter({hasText:'Methgal'})).toContainText('Pending');
 await success.click();
 await expect(page.locator('#jcm-detail-content')).toContainText('2nd');
 await expect(page.locator('#jcm-detail-content a').first()).toHaveAttribute('href',rows[0].result_source_url);
 expect(rows.every(r=>r.official_accuracy_eligible===false)).toBeTruthy();
});

test('accepted provider results populate picks, rating groups and fictional settlement',async({page})=>{
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('[data-research-index]')).toHaveCount(15);
 for(const name of ['Methgal','Indhaar','Lauderdale King','Tredegar Square','Kelpie Grey','Dandy Magic','Zoustar Dreams'])await expect(page.locator('[data-research-index]').filter({hasText:name})).toContainText('Success');
 for(const name of ['One Of The Boys','Mighty Fleur','Kykorock'])await expect(page.locator('[data-research-index]').filter({hasText:name})).toContainText('Failure');
 await expect(page.locator('[data-research-index]').filter({hasText:'Wadooda'})).toContainText('Failure');
 await page.locator('[data-research-index]').filter({hasText:'Methgal'}).click();
 await expect(page.locator('#jcm-detail-content')).toContainText('3rd');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await expect.poll(()=>page.evaluate(()=>window.jcmRatedCounts?true:false)).toBeTruthy();
 const counts=await page.evaluate(async()=>window.jcmRatedCounts([await (await fetch('data/competition-research-2026-10-12.json')).json()]));
 expect(counts.high).toEqual({win:3,loss:1});expect(counts.medium).toEqual({win:4,loss:3});
 await page.evaluate(()=>window.jcmOpenDummyAccount());
 await expect(page.locator('#jcm-detail-content')).toContainText('One Of The Boys');
 await expect(page.locator('#jcm-detail-content')).toContainText('£4,917.66');
 await expect(page.locator('#jcm-detail-content')).toContainText('Pending · 4 races');
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
 await page.goto('http://127.0.0.1:8765/#hub');
 await expect(page.locator('#jcm-daily-rate')).toContainText('63.6% success · 7/11 settled');
 const logo=await page.locator('.jcm-hub-mark').boundingBox();expect(logo.y).toBeGreaterThanOrEqual(72);
 await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('[data-account-row]')).toHaveCount(15);
 await page.locator('.jcm-modal').evaluate(el=>el.scrollTop=el.scrollHeight);
 const close=page.locator('#jcm-detail-overlay .jcm-close');
 const box=await close.boundingBox();expect(box.y).toBeGreaterThanOrEqual(24);expect(box.y+box.height).toBeLessThan(664);
 await close.click();await expect(page.locator('#jcm-detail-overlay')).not.toHaveClass(/open/);
 await page.locator('[data-page="picks"]').click();await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('#jcm-official-panel .jcm-accuracy')).toContainText('63.6% success · 7/11 settled');
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
 await expect(page.locator('[data-manual-include]:checked')).toHaveCount(0);await expect(page.locator('#jcm-detail-content')).not.toContainText('Wadooda');
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

test('individual provider URL must match result race ID',async({page,request})=>{
 await page.goto(URL);
 const d=await (await request.get('http://127.0.0.1:8765/data/competition-research-2026-10-12.json')).json();
 const r=[...d.high_competition,...d.competition_watchlist].find(r=>r.horse==='Wadooda');
 expect(await page.evaluate(r=>window.jcmAcceptedResult(r),r)).toBe(true);
 for(const url of ['https://api.theracingapi.com/v1/results/rac_999',r.result_source_url+'?race=other',r.result_source_url+'#other'])expect(await page.evaluate(r=>window.jcmAcceptedResult(r),{...r,result_source_url:url})).toBe(false);
});
