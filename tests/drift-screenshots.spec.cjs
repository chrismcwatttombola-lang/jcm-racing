const {test,expect}=require('@playwright/test');
test('morning screenshot archive shows saved quotes and awaiting T-5 without inventing movement',async({page})=>{
 await page.goto('http://127.0.0.1:8765/#hub');
 await page.locator('[data-page="drifting-odds"]').click();
 await page.locator('[data-drift-tab="screenshots"]').click();
 await expect(page.locator('[data-drift-screenshot]')).toHaveCount(16);
 await expect(page.locator('[data-drift-screenshot]').filter({hasText:'Miss Denver'})).toContainText('1.9');
 await expect(page.locator('[data-drift-screenshot]').filter({hasText:'Miss Denver'})).toContainText('Awaiting T−5 quote');
 await expect(page.locator('[data-drift-screenshot]').filter({hasText:'Koffee And Kale'})).toContainText('NR · excluded');
});
test('pre-off quote pairs show direction without assuming execution',async({page})=>{
 await page.route('**/data/drifting-odds-2026-10-13.json',async route=>{
  const response=await route.fetch();const d=await response.json();d.screenshots[0].pre_off={lay_odds:2.4,screenshot:'later-example.png',quote_timestamp:null};
  await route.fulfill({response,json:d});
 });
 await page.goto('http://127.0.0.1:8765/#hub');
 await page.locator('[data-page="drifting-odds"]').click();
 await page.locator('[data-drift-tab="screenshots"]').click();
 const row=page.locator('[data-drift-screenshot]').filter({hasText:'Miss Denver'});
 await expect(row).toContainText('DRIFT +26.3%');
 await expect(row).toContainText('2.4');
 await expect(row).toContainText('Paper-trading P/L: unavailable');
});
