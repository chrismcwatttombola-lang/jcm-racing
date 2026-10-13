const {test,expect}=require('@playwright/test');
test('Test 1 opens from Hub, records lay/back strategies and preserves other tiles',async({page})=>{
 await page.goto('http://127.0.0.1:8765/#hub');
 await expect(page.locator('[data-page="picks"]')).toHaveCount(1);
 await expect(page.locator('[data-page="dummy-account"]')).toHaveCount(1);
 await page.locator('[data-page="test-1"]').click();
 await expect(page.locator('.jcm-test1-panel')).toBeVisible();
 await expect(page.locator('#t1-liability')).toHaveValue('500');
 await expect(page.locator('#t1-stake')).toHaveValue('500');
 await page.locator('#t1-horse').fill('Example Horse');
 await page.locator('#t1-course').fill('Kempton');
 await page.locator('#t1-time').fill('19:15');
 await page.locator('#t1-add').click();
 const row=page.locator('.jcm-test1-race').last();
 await row.locator('[data-field="morningLay"]').fill('3');
 await row.locator('[data-field="morningLay"]').dispatchEvent('change');
 await row.locator('[data-field="laterLay"]').fill('4');
 await row.locator('[data-field="laterLay"]').dispatchEvent('change');
 await row.locator('[data-field="laterBack"]').fill('3.8');
 await row.locator('[data-field="laterBack"]').dispatchEvent('change');
 await row.locator('[data-field="result"]').selectOption('lost');
 await expect(row).toContainText('-£250.00');
 await expect(page.locator('#t1-summary')).toContainText('-£250.00');
 await page.reload();
 await page.locator('[data-page="test-1"]').click();
 await expect(page.locator('.jcm-test1-race')).toHaveCount(1);
 await expect(page.locator('.jcm-test1-race')).toContainText('Example Horse');
});
test('Test 1 leaves shorteners as lays and excludes pending and non-runners',async({page})=>{
 await page.goto('http://127.0.0.1:8765/#hub');
 await page.locator('[data-page="test-1"]').click();
 await page.locator('#t1-horse').fill('Shortener');
 await page.locator('#t1-course').fill('Newcastle');
 await page.locator('#t1-time').fill('18:30');
 await page.locator('#t1-add').click();
 const row=page.locator('.jcm-test1-race').last();
 for(const [field,value] of [['morningLay','3'],['laterLay','2.5'],['laterBack','2.4']]){
  await row.locator('[data-field="'+field+'"]').fill(value);
  await row.locator('[data-field="'+field+'"]').dispatchEvent('change');
 }
 await row.locator('[data-field="result"]').selectOption('lost');
 await expect(page.locator('#t1-summary')).toContainText('£250.00');
 await expect(page.locator('#t1-summary')).toContainText('-£250.00');
 await row.locator('[data-field="result"]').selectOption('nr');
 await expect(page.locator('#t1-summary')).toContainText('0 / 1');
});
