import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright end-to-end configuration (issue #73).
 *
 * The e2e suite runs against the production build of the web app started in
 * mock mode (MOCK_API=1, issue #100) so it needs no Postgres/Redis — CI and
 * local runs are identical. Override the target with E2E_BASE_URL when you
 * want to run against a different server.
 *
 * Run locally:
 *   cd apps/web
 *   npx playwright install chromium
 *   npm run build          # production build (uses .env values)
 *   MOCK_API=1 npm start & # server on :3000
 *   npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
