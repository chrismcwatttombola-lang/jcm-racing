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
test('today retains all 15 horses, confidence and chronological order; rated totals remain zero', async ({page}) => {
 await page.goto(URL);await page.locator('#date').selectOption('2026-10-12');
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(15);
 await expect(page.locator('#jcm-official-panel .jcm-status.pending')).toHaveCount(15);
 const times=await page.locator('#jcm-official-panel .jcm-time').allTextContents();expect(times).toEqual([...times].sort());
 await page.locator('#jcm-official-panel .jcm-row').filter({hasText:'Kykorock'}).click();
 await expect(page.locator('#jcm-detail-content .jcm-confidence.high')).toContainText('85%');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await expect(page.locator('#jcm-rated-ratios')).toContainText('0 / 0');
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
