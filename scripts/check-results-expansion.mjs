import { chromium } from '@playwright/test';import fs from 'node:fs/promises';
const browser=await chromium.launch();const page=await browser.newPage();const errors=[];const layouts=[];page.on('pageerror',e=>errors.push(String(e)));
for(const width of [375,768,1024,1440]){
 await page.setViewportSize({width,height:900});
 for(const route of ['/','/gallery','/otzyvy','/design/student-results']){
  await page.goto(`http://127.0.0.1:4323${route}`,{waitUntil:'domcontentloaded',timeout:120000});await page.locator('h1').waitFor();
  if(await page.locator('[data-cookie=necessary]:visible').count())await page.locator('[data-cookie=necessary]').click();
  const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);if(scroll>width+1)throw Error(`${route} overflow ${scroll}/${width}`);
  if(route==='/otzyvy'){
   await page.locator('[data-review-source=yandex]').click();const y=page.locator('[data-review-kind]:visible');if(await y.count()!==1)throw Error('Yandex filter mismatch');if(!await y.first().locator('a[href*="yandex"]').count())throw Error('Source link missing');
   await page.locator('[data-review-source=azbuka]').click();if(await page.locator('[data-review-kind]:visible').count()!==1)throw Error('Azbuka filter mismatch');
   await page.locator('[data-review-source=all]').click();const n=await page.locator('[data-review-kind]:visible').count();await page.locator('[data-reviews-more]').click();if(await page.locator('[data-review-kind]:visible').count()<=n)throw Error('More reviews failed');
   if(!await page.locator('#kings-title .award').count()||!await page.locator('#stories-title .story').count())throw Error('Missing awards or stories');
   if(await page.getByText('Прочитать отзыв полностью',{exact:true}).count())throw Error('Full reviews rendered');
  }
  if(route==='/design/student-results'){
   const range=page.locator('[data-ba] input').first();await range.fill('70');if(!((await range.getAttribute('aria-valuetext'))?.includes('модели')))throw Error('Comparison slider failed');
   if([375,1440].includes(width)){await page.evaluate(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`/private/tmp/gripinsky-combined-${width}.png`,fullPage:true});}
  }
  layouts.push({route,width,overflow:false});
 }
}
await browser.close();if(errors.length)throw Error(errors.join('\n'));await fs.writeFile('docs/content/results-expansion-check.json',JSON.stringify({layouts,errors,filters:'passed',comparison:'passed'},null,2));console.log('Passed 16 layouts, sources, pagination, comparison, awards and stories.');
