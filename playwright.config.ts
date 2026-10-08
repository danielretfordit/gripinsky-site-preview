import { defineConfig, devices } from '@playwright/test';

// Автотесты в настоящем браузере на четырёх ширинах. Запуск: npm run e2e (dev-сервер должен работать или запустится сам)
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: true,
  workers: 3,
  // Локально dev-сервер перезагружает открытые страницы, когда в проекте меняются файлы (HMR):
  // тест, попавший на такую перезагрузку, повторяется один раз и помечается в отчёте как flaky
  retries: process.env.CI ? 0 : 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-375', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 375, height: 812 } } },
    { name: 'tablet-768', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'laptop-1024', use: { browserName: 'chromium', viewport: { width: 1024, height: 768 } } },
    { name: 'desktop-1440', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: 'npm run dev', url: process.env.BASE_URL ?? 'http://localhost:4321', reuseExistingServer: true, timeout: 120_000 },
});
