import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const origin=process.env.PAGES_ORIGIN || 'http://127.0.0.1:4323';
const base='/gripinsky-site';
const root=path.resolve('dist/client');
const invalid=[];
function audit(dir) {
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) audit(p);
    else if(ent.name.endsWith('.html')) {
      const html=fs.readFileSync(p,'utf8');
      for(const m of html.matchAll(/\b(?:href|src)=["'](\/[^"']*)["']/g)) {
        const v=m[1].split(/[?#]/)[0];
        if(v.startsWith('//'))continue;
        if(!v.startsWith(base+'/')) invalid.push([p.slice(root.length),v,'base']);
        else if(!fs.existsSync(path.join(root,v.slice(base.length)))) invalid.push([p.slice(root.length),v,'missing']);
      }
    }
  }
}
audit(root);
if(invalid.length)throw Error(JSON.stringify(invalid.slice(0,15)));
console.log('Static href/src audit passed.');
const browser=await chromium.launch();
try {
  for(const width of [375,1440]) {
    const context=await browser.newContext({viewport:{width,height:900}});
    await context.addInitScript(()=>localStorage.setItem('gr-cookie-consent','necessary'));
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    for(const route of ['/index.html','/courses-page/visualization.html','/ai.html','/courses.html?soft=3ds+max','/gallery.html']) {
      const res=await page.goto(origin+base+route);
      expect(res.status()).toBe(200);
      await expect.poll(()=>page.locator('astro-island[ssr]').count(),{timeout:20000}).toBe(0);
      await page.evaluate(async()=>{await document.fonts.ready;for(let y=0;y<document.documentElement.scrollHeight;y+=700){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,30));}});
      expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain('noindex');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
      expect(await page.locator('form[data-lead-form]').count()).toBe(0);
      const bad=await page.locator('a[href^="/"]').evaluateAll(a=>a.filter(x=>!x.getAttribute('href').startsWith('/gripinsky-site/')).map(x=>x.getAttribute('href')));
      expect(bad).toEqual([]);
      if(route.includes('visualization')) {
        await expect(page.locator('.learning-ladder__step')).toHaveCount(4);
        await page.getByRole('radio',{name:/Наставничество/}).click();
        await expect(page.getByRole('radio',{name:/Наставничество/})).toHaveAttribute('aria-checked','true');
        await page.getByRole('button',{name:'Купить только базу',exact:true}).click();
        await expect(page.getByRole('dialog')).toContainText('Ваш выбор в демоверсии');
        await expect(page.getByRole('dialog').locator('form')).toHaveCount(0);
        await page.keyboard.press('Escape');
      }
      if(route.includes('/ai.')) await expect(page.locator('.ai-roadmap__step')).toHaveCount(6);
      if(route.includes('/courses.html')) await expect(page.locator('[data-filter-tag="soft"]')).toHaveValue('3ds max');
      console.log(width,route,'OK');
    }
    expect(errors).toEqual([]);
    await context.close();
  }
} finally {await browser.close();}
