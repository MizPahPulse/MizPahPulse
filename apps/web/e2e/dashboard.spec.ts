/**
 * End-to-end smoke tests for the core dashboard flows (issue #73).
 *
 * Runs against the production web build started with MOCK_API=1, so the API
 * serves the deterministic in-memory dataset and no external services are
 * required: dashboard → feed (simulate) → search → webhooks.
 */
import { test, expect, Page } from '@playwright/test';

async function gotoDashboard(page: Page) {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Overview|Dashboard/i }).first()).toBeVisible();
}

test.describe('Dashboard flows', () => {
  test('dashboard shell renders and navigation works', async ({ page }) => {
    await page.goto('/dashboard');

    // Sidebar navigation to the primary sections.
    const nav = page.getByRole('navigation').first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: /Feed/i }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: /Search/i }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: /Webhooks/i }).first()).toBeVisible();
  });

  test('feed page offers simulation and renders simulated events', async ({ page }) => {
    await page.goto('/dashboard/feed');

    // No WebSocket server in the mock environment → the page offers the
    // client-side event simulator.
    const simulate = page.getByRole('button', { name: 'Simulate events' });
    await expect(simulate).toBeVisible();
    await simulate.click();

    // A simulated event should appear in the feed within a few seconds.
    await expect(page.locator('article').first()).toBeVisible({ timeout: 15_000 });
  });

  test('search page returns results for a known account', async ({ page }) => {
    await page.goto('/dashboard/search');

    // Two search inputs exist (global + page); scope to the page's own input.
    const input = page
      .locator('main')
      .getByPlaceholder(/Search/)
      .last();
    await input.fill('GAJB5URQ');
    await page.keyboard.press('Enter');

    // The mock dataset seeds events/transactions for this account, so the
    // grouped results include a row whose truncated key starts with GAJB5URQ.
    await expect(
      page
        .locator('main')
        .getByText(/GAJB5URQ/)
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test('webhooks page lists the seeded subscription', async ({ page }) => {
    await page.goto('/dashboard/webhooks');

    // The mock dataset seeds one webhook for the default user.
    await expect(page.getByText('https://example.com/webhooks/stellar').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('wallets page renders and offers to connect Freighter', async ({ page }) => {
    await page.goto('/dashboard/wallets');

    await expect(page.getByRole('heading', { name: 'Wallets', exact: true })).toBeVisible();
    // Freighter is not installed in the e2e browser → install CTA shows.
    await expect(
      page.getByText(/Freighter Wallet Not Detected|Install Freighter/i).first(),
    ).toBeVisible();
  });
});
