import { defineConfig, devices } from '@playwright/test';

// Визуальные снимки и проверки раскладки на СОБРАННОМ сайте (как на хостинге), а не на dev-сервере.
// Порядок: npm run build, затем npm run visual (сравнение с эталоном) или npm run visual:update (новый эталон).
// Эталон лежит в docs/design/shots/baseline (в git не попадает, пересоздаётся локально).
// PW_CHROMIUM — путь к своему Chromium (например, /opt/pw-browsers/chromium), PW_WEBKIT=1 — добавить WebKit (iPhone, iPad).
const chromium = process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {};
const widths = [360, 375, 414, 768, 1024, 1280, 1440, 1920];

export default defineConfig({
  testDir: './e2e-visual',
  timeout: 120_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report/visual' }]],
  snapshotPathTemplate: 'docs/design/shots/baseline/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide', scale: 'css' } },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4323',
    reducedMotion: 'reduce',
    trace: 'off',
  },
  projects: [
    ...widths.map((w) => ({
      name: `w${w}`,
      use: w < 768
        ? { ...devices['iPhone 13'], browserName: 'chromium' as const, viewport: { width: w, height: 800 }, ...chromium }
        : { browserName: 'chromium' as const, viewport: { width: w, height: 900 }, ...chromium },
    })),
    ...(process.env.PW_WEBKIT ? [
      { name: 'webkit-iphone', use: { ...devices['iPhone 13'] } },
      { name: 'webkit-ipad', use: { ...devices['iPad (gen 7)'] } },
    ] : []),
  ],
  webServer: [
    { command: 'npx astro preview --port 4322', url: 'http://localhost:4322', reuseExistingServer: true, timeout: 120_000 },
    { command: 'node scripts/serve-dist.mjs', url: 'http://localhost:4323', reuseExistingServer: true, timeout: 30_000 },
  ],
});
