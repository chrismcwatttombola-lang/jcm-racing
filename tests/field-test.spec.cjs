const {test,expect}=require('@playwright/test');
test('isolated field test displays four unrated horses and preserves official panels',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Field Test/}).click();
 await expect(page.locator('#jcm-field-test')).toBeVisible();
 for(const horse of ['Bengal Tiger','Faiyum','Beset','Royal Acclamation'])await expect(page.locator('#jcm-field-test').getByText(horse,{exact:true})).toHaveCount(1);
 await expect(page.locator('#jcm-field-test .jcm-ft-rating')).toHaveCount(4);
 await expect(page.locator('#jcm-field-test .jcm-ft-rating').first()).toHaveText('Not rated');
 await expect(page.locator('#jcm-field-test')).toContainText('No official results or accuracy impact');
 await page.locator('#date').selectOption('2026-10-09');
 await expect(page.locator('#jcm-field-test')).toBeHidden();
});
