import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const origin = process.env.PAGES_ORIGIN || 'http://127.0.0.1:4323';
const base = '/gripinsky-site';
const root = path.resolve('dist/client');
const invalid = [];

function audit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      // Design previews are noindex drafts and intentionally link to dev-only variants.
      if (entry.name !== 'design') audit(filename);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    const html = fs.readFileSync(filename, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)=["'](\/[^"']*)["']/g)) {
      const value = match[1].split(/[?#]/)[0];
      if (value.startsWith('//')) continue;
      if (!value.startsWith(`${base}/`)) {
        invalid.push([filename.slice(root.length), value, 'base']);
        continue;
      }
      const target = path.resolve(root, `.${value.slice(base.length)}`);
      if (!fs.existsSync(target)) invalid.push([filename.slice(root.length), value, 'missing']);
    }
  }
}

audit(root);
if (invalid.length) throw new Error(JSON.stringify(invalid.slice(0, 15)));
console.log('Static href/src audit passed.');

const browser = await chromium.launch();
try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('gr-cookie-consent', 'necessary'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    for (const route of ['/index.html', '/courses-page/visualization.html', '/ai.html', '/courses.html?soft=3ds+max', '/gallery.html']) {
      const response = await page.goto(origin + base + route);
      expect(response.status()).toBe(200);
      await expect.poll(() => page.locator('astro-island[ssr]').count(), { timeout: 20_000 }).toBe(0);
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
      });
      expect(await page.locator('meta[name=robots]').getAttribute('content')).toContain('noindex');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      expect(await page.locator('form[data-lead-form]').count()).toBe(0);
      const badLinks = await page.locator('a[href^="/"]').evaluateAll((links) =>
        links.map((link) => link.getAttribute('href')).filter((href) => !href.startsWith('/gripinsky-site/')),
      );
      expect(badLinks).toEqual([]);

      if (route.includes('visualization')) {
        const tabs = page.locator('.prototype-tabs [role=tab]');
        await expect(tabs).toHaveCount(3);
        await tabs.nth(1).click();
        await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
        const course = page.locator('.prototype-panel:not([hidden]) input[data-cart-select]:not([disabled])').first();
        await expect(course).toBeEnabled();
        await course.check();
        const cart = page.locator('[data-site-cart]');
        await expect(cart).toBeVisible();
        await cart.getByRole('button', { name: 'Открыть корзину' }).click();
        await expect(page.locator('[data-cart-dialog]')).toBeVisible();
        await page.locator('[data-cart-dialog]').getByRole('button', { name: 'Оформить пакет' }).click();
        const previewDialog = page.getByRole('dialog', { name: 'Ваш выбор в демоверсии' });
        await expect(previewDialog).toBeVisible();
        await expect(previewDialog.locator('form')).toHaveCount(0);
        await page.keyboard.press('Escape');
      }
      if (route.includes('/ai.')) await expect(page.locator('.ai-roadmap__step')).toHaveCount(6);
      if (route.includes('/courses.html')) await expect(page.locator('[data-filter-tag="soft"]')).toHaveValue('3ds max');
      console.log(width, route, 'OK');
    }

    expect(errors).toEqual([]);
    await context.close();
  }
} finally {
  await browser.close();
}
