import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { mockFolders, setupApiMocks } from './mocks';

const TEST_SERVER_URL = 'https://rss.example.com';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass';

async function completeLogin(page: Page) {
  await page.goto('/login/');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10_000 });
  await page.getByLabel(/username/i).fill(TEST_USERNAME);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
  await page.waitForURL(/\/timeline/, { timeout: 10_000 });
}

test.describe('Folder queue pills', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, TEST_SERVER_URL);
    await page.goto('/');
    await page.waitForURL(/\/login\//);
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('renders pills in unread order and highlights the active folder', async ({ page }) => {
    await completeLogin(page);

    const pills = page.locator('[role="tablist"] button');
    await expect(pills).toHaveCount(3);

    const texts = await pills.allTextContents();
    expect(texts[0]).toMatch(/Engineering Updates\s*\(3\)/);
    expect(texts[1]).toMatch(/Design Inspiration\s*\(2\)/);
    expect(texts[2]).toMatch(/Podcasts\s*\(1\)/);

    await expect(pills.nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('selects a pill, pins it first, and filters the timeline list', async ({ page }) => {
    await completeLogin(page);

    const pills = page.locator('[role="tablist"] button');
    await pills.nth(1).click();

    await expect(pills.nth(0)).toContainText(/Design Inspiration/);
    await expect(pills.nth(0)).toHaveAttribute('aria-selected', 'true');

    await expect(page.getByText('Color Systems for 2025')).toBeVisible();
    await expect(page.getByText('Ship It Saturday: Folder Queue')).toHaveCount(0);
  });

  test('mark-all-read removes the active pill and advances the queue', async ({ page }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;
    await page.route(`${apiBase}/items/read/multiple`, async (route) => {
      await route.fulfill({ status: 200 });
    });

    await completeLogin(page);

    await page.getByRole('button', { name: /mark all as read/i }).click();

    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(mockFolders[1]?.name ?? 'Design Inspiration', 'i'),
    );
    await expect(page.getByTestId('folder-pill-10')).toHaveCount(0);
  });

  test('skip moves the active folder pill to the end', async ({ page }) => {
    await completeLogin(page);

    await page.getByRole('button', { name: /^skip$/i }).click();

    const pills = page.locator('[role="tablist"] button');
    const texts = await pills.allTextContents();
    expect(texts[0]).toMatch(/Design Inspiration/);
    expect(texts[2]).toMatch(/Engineering Updates/);
  });
});
