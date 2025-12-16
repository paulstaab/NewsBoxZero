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

test.describe('Timeline folders (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, TEST_SERVER_URL);
    await page.goto('/');
    await page.waitForURL(/\/login\//);
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('surfaces the highest-priority folder first', async ({ page }) => {
    await completeLogin(page);
    const topFolderName = mockFolders[0]?.name ?? 'Engineering Updates';

    await expect(page).toHaveURL(/\/timeline/);
    await expect(page.getByTestId('active-folder-name')).toHaveText(new RegExp(topFolderName, 'i'));
    await expect(page.getByTestId('active-folder-unread')).toHaveText('3');

    await expect(page.getByText('Ship It Saturday: Folder Queue')).toBeVisible();
    await expect(page.getByText('Accessibility Improvements Rolling Out')).toBeVisible();
    await expect(page.getByText('Observability Deep Dive')).toBeVisible();
    await expect(page.getByText('Color Systems for 2025')).toHaveCount(0);
  });

  test('shows the caught-up empty state when no unread articles remain', async ({ page }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;
    await page.route(`${apiBase}/items**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });

    await completeLogin(page);

    await expect(page.getByRole('heading', { name: /timeline/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
    await expect(page.getByText(/no unread articles/i)).toBeVisible();
  });

  test('marks all items in a folder as read and advances to next folder (US2)', async ({
    page,
  }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;
    let markMultipleReadCalled = false;

    await page.route(`${apiBase}/items/read/multiple`, async (route) => {
      markMultipleReadCalled = true;
      const postData = route.request().postDataJSON() as { itemIds?: number[] };
      expect(postData.itemIds).toBeDefined();
      expect(postData.itemIds?.length).toBeGreaterThan(0);
      await route.fulfill({ status: 204 });
    });

    await completeLogin(page);

    const firstFolderName = mockFolders[0]?.name ?? 'Engineering Updates';
    const secondFolderName = mockFolders[1]?.name ?? 'Design Thinking';

    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(firstFolderName, 'i'),
    );
    await expect(page.getByTestId('active-folder-unread')).toHaveText('3');

    // Click Mark All as Read button
    await page.getByRole('button', { name: /mark all as read/i }).click();

    // Verify API was called
    await page.waitForTimeout(500);
    expect(markMultipleReadCalled).toBe(true);

    // Verify the next folder appears
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(secondFolderName, 'i'),
      { timeout: 5000 },
    );

    // Articles from first folder should be gone
    await expect(page.getByText('Ship It Saturday: Folder Queue')).toHaveCount(0);

    // Articles from second folder should appear
    await expect(page.getByText('Color Systems for 2025')).toBeVisible();
  });
});
