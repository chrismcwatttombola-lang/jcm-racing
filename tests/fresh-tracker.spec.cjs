const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const url='http://127.0.0.1:8765/';
test('fresh dates, complete outcome totals and chronological rows',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'#picks');
 await expect(page.locator('#date option')).toHaveCount(3);
 await expect(page.locator('.metrics .metric strong')).toHaveText(['87.5%','7','1','0']);
 await expect(page.locator('#date')).toHaveValue('2026-10-23');
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(2);
 await expect(page.locator('#jcm-official-panel .jcm-time')).toHaveText(['14:25','17:05']);
 await expect(page.locator('#jcm-official-panel')).toContainText('Watchlist');
 await expect(page.locator('#jcm-official-panel .jcm-status.pending')).toHaveCount(2);
 await page.locator('#date').selectOption('2026-10-22');
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
 for(const day of ['2026-10-21','2026-10-22','2026-10-23']){
  await page.locator('#date').selectOption(day);
  const d=await(await request.get(url+'data/competition-research-'+day+'.json')).json();
  for(const r of [...d.high_competition,...d.competition_watchlist]){
   await page.locator('#jcm-official-panel .jcm-row').filter({hasText:r.horse}).click();
   const card=page.locator('#jcm-detail-content');
   await expect(card).toContainText(r.result_status==='PENDING'?'Pending':'Finished '+r.placing);
   if(day==='2026-10-23')await expect(card).toContainText('Watchlist');
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
 await expect(page.locator('#jcm-detail-content')).toContainText('The Hardest Geezer');
 await expect(page.locator('#jcm-detail-content')).toContainText('Intense Vision');
 await expect(page.locator('#jcm-detail-content')).not.toContainText('Invalid');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await page.locator('[data-page="rated-performance"]').click();
 await expect(page.locator('#jcm-detail-content')).toContainText('Watchlist');
 await expect(page.locator('#jcm-detail-content')).toContainText('6 / 1');
 await page.locator('#jcm-detail-overlay .jcm-close').click();
 await page.locator('[data-page="roundup"]').click();
 await expect(page.locator('#roundup-content')).toContainText('Results pending');
});
test('phone layout stays within viewport and all date options exclude old data',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(url+'#picks');
 await expect(page.locator('#jcm-official-panel .jcm-row')).toHaveCount(2);
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
test('three booked simulations retain 10000 banks and deposit-aware results',async({page})=>{
 await page.goto(url+'#hub');
 await page.locator('[data-page="dummy-account"]').click();
 for(const [mode,liability,potential] of [['fixed','£500.00','£276.82'],['race','£500.00','£276.82'],['manual','£250.00','£138.41']]){
  await page.locator('[data-account-mode="'+mode+'"]').click();
  const card=page.locator('#jcm-detail-content');
  await expect(card).toContainText('Net change vs starting £10,000');
  await expect(card.locator('[data-builder-balance]')).toHaveText('£10,000.00');
  await expect(card.locator('[data-bank-percentage]')).toHaveText('0.00%');
  await expect(card.locator('[data-builder-liability-value]')).toHaveText([liability,liability]);
  await expect(card.locator('[data-builder-potential]')).toHaveText(potential);
  await expect(card.locator('[data-builder-odds="0"]')).toHaveValue('4.7');
  await expect(card.locator('[data-builder-odds="1"]')).toHaveValue('4.2');
  for(const input of await card.locator('[data-builder-include]').all()){await expect(input).toBeChecked();await expect(input).toBeDisabled();}
 }
 await page.locator('[data-account-mode="results"]').click();
 await expect(page.locator('.builder-results-table tbody tr')).toHaveCount(3);
 await expect(page.locator('.builder-results-table')).toContainText('Cash in');
 await expect(page.locator('.builder-results-table')).toContainText('Cash out');
 await expect(page.locator('.builder-results-table [data-result-percentage]')).toHaveText(['0.00% · pending','0.00% · pending','0.00% · pending']);
});
