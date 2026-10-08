import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch();const page=await browser.newPage();const results=[];const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
for(const width of [375,768,1024,1440]){
 await page.setViewportSize({width,height:900});
 for(const route of ['/design/student-results','/otzyvy','/gallery']){
  await page.goto(`http://127.0.0.1:4323${route}`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('h1').waitFor();
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  if(size.scroll>width+1)throw Error(`Overflow ${route} at ${width}: ${size.scroll}`);
  if(await page.getByText('Прочитать отзыв полностью',{exact:true}).count())throw Error('Full review UI still present');
  if(route==='/gallery'){
   const initial=await page.locator('[data-gallery] > li:visible').count();
   if(initial>36)throw Error('Gallery initial limit failed');
   await page.locator('[data-gallery-more]').click();
   if(await page.locator('[data-gallery] > li:visible').count()<=initial)throw Error('Load more failed');
   await page.locator('[data-cat="model"]').click();
   const visible=page.locator('[data-gallery] > li:visible');if(!await visible.count())throw Error('Empty model filter');
   const cats=await visible.first().getAttribute('data-cats');if(!cats?.includes('model'))throw Error('Filter mismatch');
   await visible.first().locator('button[data-open]').click();await page.locator('#lightbox').waitFor({state:'visible'});await page.keyboard.press('Escape');
  }
  if(route==='/design/student-results'){if(await page.locator('[data-cookie=necessary]:visible').count())await page.locator('[data-cookie=necessary]').click();await page.evaluate(async()=>{const images=[...document.images];images.forEach(i=>i.loading='eager');await Promise.all(images.map(i=>i.decode().catch(()=>{})));});}
  if(route==='/design/student-results'&&[375,1440].includes(width))await page.screenshot({path:`/private/tmp/gripinsky-students-${width}.png`,fullPage:true});
  results.push({route,width,overflow:false});
 }
}
await browser.close();await fs.writeFile('docs/content/student-preview-check.json',JSON.stringify({results,errors},null,2));if(errors.length)throw Error(errors.join('\n'));console.log('Passed 12 layouts, gallery filtering and lightbox.');
