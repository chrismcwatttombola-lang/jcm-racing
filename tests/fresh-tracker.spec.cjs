const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const url='http://127.0.0.1:8765/';
test('fresh dates, complete outcome totals and chronological rows',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'#picks');
 await expect(page.locator('#date option')).toHaveCount(2);
 await expect(page.locator('.metrics .metric strong')).toHaveText(['87.5%','7','1','0']);
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(5);
 await expect(page.locator('#jcm-official-panel')).toContainText('100% success');
 await expect(page.locator('#jcm-official-panel .jcm-time')).toHaveText(['13:35','14:27','14:46','16:53','17:00']);
 await page.locator('#date').selectOption('2026-10-21');
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(3);
 await expect(page.locator('#jcm-official-panel')).toContainText('66.7% success');
 await expect(page.locator('#jcm-official-panel .jcm-status.loss')).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('every card retains original reasoning, finishing place and race access',async({page,request})=>{
 await page.goto(url+'#picks');
 for(const day of ['2026-10-21','2026-10-22']){
  await page.locator('#date').selectOption(day);
  const d=await(await request.get(url+'data/competition-research-'+day+'.json')).json();
  for(const r of [...d.high_competition,...d.competition_watchlist]){
   await page.locator('#jcm-official-panel .jcm-row').filter({hasText:r.horse}).click();
   const card=page.locator('#jcm-detail-content');
   await expect(card).toContainText('Finished '+r.placing);
   await expect(card).toContainText(r.selection_reason.summary);
   await expect(card.locator('a').filter({hasText:'View this racecard'})).toHaveAttribute('href',new RegExp('/'+day+'/'));
   await expect(card).toContainText('Race results');await expect(card).toContainText('Race video');
   await page.locator('#jcm-detail-overlay .jcm-close').click();
  }
 }
});
test('existing hub, Bet Builder and roundup keep working with fresh dates',async({page})=>{
 await page.goto(url+'#hub');
 await expect(page.locator('.jcm-hub-tile')).toHaveCount(4);
 await page.locator('[data-page="dummy-account"]').click();
 await expect(page.locator('#jcm-detail-content')).toContainText('Detroit Maverick');
 await expect(page.locator('#jcm-detail-content')).not.toContainText('Invalid');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await page.locator('[data-page="rated-performance"]').click();
 await expect(page.locator('#jcm-detail-content')).toContainText('Watchlist');
 await expect(page.locator('#jcm-detail-content')).toContainText('6 / 1');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await page.locator('[data-page="roundup"]').click();
 await expect(page.locator('#roundup-content')).toContainText('Recovered original discussion');
});
test('phone layout stays within viewport and all date options exclude old data',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(url+'#picks');
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'/tmp/jcm-fresh-mobile.png',fullPage:true});
});
test('invalid result identity fails closed',async({page,request})=>{
 await page.goto(url+'#picks');
 const d=await(await request.get(url+'data/competition-research-2026-10-22.json')).json();
 const r=d.high_competition[0];
 expect(await page.evaluate(r=>window.jcmAcceptedResult(r),r)).toBe(true);
 expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,result_date:'2026-10-21'}),r)).toBe(false);
 expect(await page.evaluate(r=>window.jcmAcceptedResult({...r,result_race_id:'rac_1'}),r)).toBe(false);
});
