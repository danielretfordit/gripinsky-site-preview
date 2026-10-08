import { test, expect } from '@playwright/test';

const professions = {
  props: { main: ['blender', 'gamedevlevel1'], addons: ['art_pro', 'azbukaps', 'zbrush0', 'substancepainter', 'unrealenginelevel1', 'ai', 'maya_level1'], trial: true },
  environment: { main: ['blender', 'gamedevlevel1', 'gamedevlevel2'], addons: ['art_pro', 'azbukaps', 'zbrush0', 'substancepainter', 'unrealenginelevel1', 'ai', 'maya_level1'], trial: true },
  character: { main: ['blender', 'gamedevlevel1', 'stylized_character'], addons: ['art_pro', 'azbukaps', 'zbrush0', 'zbrushportret', 'substancepainter', 'unrealenginelevel1', 'ai', 'maya_level1'], trial: true },
  foliage: { main: ['blender', 'speedtree'], addons: ['art_pro', 'azbukaps', 'zbrush0', 'substancepainter', 'unrealenginelevel1'], trial: true },
  'hard-surface': { main: ['maya_level1'], addons: ['art_pro', 'azbukaps', 'zbrush0', 'substancepainter', 'unrealenginelevel1'], trial: false },
  unreal: { main: ['unrealenginelevel1'], addons: ['blender', 'art_pro', 'azbukaps', 'speedtree'], trial: false },
};

test('игровые профессии: состав из документа и переключение', async ({ page }) => {
  await page.goto('/courses-page/gamedev');
  for (const [id, expected] of Object.entries(professions)) {
    await page.locator(`[data-game-profession="${id}"]`).click();
    const panel = page.locator(`#game-panel-${id}`);
    await expect(panel).toBeVisible();
    await expect(page.locator('.games-panel:visible')).toHaveCount(1);
    expect(await panel.locator('.games-course-grid [data-cart-select]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-cart-select')))).toEqual(expected.main);
    expect(await panel.locator('[data-game-addon]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-game-addon')))).toEqual(expected.addons);
    await expect(page.locator('.games-free')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('[data-game-profession="character"]').click();
  await expect(page.locator('#game-panel-character a[href="/p_zbrushabsolute"]')).toHaveCount(1);
  await expect(page.locator('#game-panel-character a[href="/p_texturegamedev"]')).toHaveCount(1);
  await page.locator('[data-game-profession="character"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#game-panel-foliage')).toBeVisible();
});

test('основной курс и Photoshop добавляются в общую корзину', async ({ page }) => {
  await page.goto('/courses-page/gamedev?profession=props');
  for (const id of ['gamedevlevel1', 'azbukaps']) {
    const button = page.locator(`#game-panel-props [data-cart-select="${id}"]`);
    await expect(button).toBeEnabled();
    await button.check();
    await expect(button).toBeChecked();
    await expect(page.locator('[data-cart-dialog]')).not.toBeVisible();
  }
});
