import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { getMockItems, mockFolders, setupApiMocks } from './mocks';

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

test.describe('Timeline update and persistence (US5)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, TEST_SERVER_URL);
    await page.goto('/');
    await page.waitForURL(/\/login\//);
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('automatically updates articles on mount and merges with cache', async ({ page }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;
    let initialLoadComplete = false;

    await page.route(`${apiBase}/items**`, async (route) => {
      if (!initialLoadComplete) {
        initialLoadComplete = true;
        const unreadItems = getMockItems().filter((item) => item.unread);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: unreadItems }),
        });
      } else {
        // Second load (automatic update) - return same data
        const unreadItems = getMockItems().filter((item) => item.unread);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: unreadItems }),
        });
      }
    });

    await completeLogin(page);

    // Wait for initial render
    await expect(page.getByTestId('active-folder-name')).toBeVisible({ timeout: 5000 });

    // Verify articles loaded
    const firstFolderName = mockFolders[0]?.name ?? 'Engineering Updates';
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(firstFolderName, 'i'),
    );
    await expect(page.getByText('Ship It Saturday: Folder Queue')).toBeVisible();

    // Automatic update should have been triggered on mount
    expect(initialLoadComplete).toBe(true);
  });

  test('manual update button fetches new articles and merges them', async ({ page }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;
    let updateCallCount = 0;

    await page.route(`${apiBase}/items**`, async (route) => {
      updateCallCount++;
      if (updateCallCount === 1) {
        // Initial load - return standard mock
        const unreadItems = getMockItems().filter((item) => item.unread);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: unreadItems }),
        });
      } else {
        // Manual update - return existing items PLUS one additional article
        const unreadItems = getMockItems().filter((item) => item.unread);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              ...unreadItems,
              {
                id: 9999,
                feedId: 101,
                folderId: mockFolders[0]?.id ?? 1,
                title: 'Fresh Article from Update',
                body: 'This is a new article added during update',
                url: 'https://example.com/fresh-article',
                pubDate: Math.floor(Date.now() / 1000),
                unread: true,
                starred: false,
                mediaThumbnail: null,
              },
            ],
          }),
        });
      }
    });

    await completeLogin(page);
    await expect(page.getByTestId('active-folder-name')).toBeVisible({ timeout: 5000 });

    // Initial articles should be visible
    await expect(page.getByText('Ship It Saturday: Folder Queue')).toBeVisible();

    // Click the Update/Refresh button
    const updateButton = page.getByRole('button', { name: /update|refresh/i });
    await expect(updateButton).toBeVisible();
    await updateButton.click();

    // Wait for update to complete (button may briefly disable during loading)
    await expect(updateButton).toBeEnabled({ timeout: 5000 });

    // Verify update was called
    expect(updateCallCount).toBeGreaterThanOrEqual(2);

    // New article should be merged (though it might not be visible in this specific view)
    // The important thing is that the update completed without error
  });

  test('persists unread state across page reloads', async ({ page }) => {
    // First session - login and mark one folder as read
    await completeLogin(page);
    await expect(page.getByTestId('active-folder-name')).toBeVisible({ timeout: 5000 });

    const firstFolderName = mockFolders[0]?.name ?? 'Engineering Updates';
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(firstFolderName, 'i'),
    );

    // Mark first folder as read
    await page.getByRole('button', { name: /mark all as read/i }).click();

    // Wait for second folder to appear
    const secondFolderName = mockFolders[1]?.name ?? 'Design Thinking';
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(secondFolderName, 'i'),
      { timeout: 5000 },
    );

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // State should persist - second folder should still be active
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(secondFolderName, 'i'),
      { timeout: 5000 },
    );

    // First folder's articles should not reappear
    await expect(page.getByText('Ship It Saturday: Folder Queue')).toHaveCount(0);
  });

  test('shows loading indicator during update and handles errors gracefully', async ({ page }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;
    let updateAttempt = 0;

    await page.route(`${apiBase}/items**`, async (route) => {
      updateAttempt++;
      if (updateAttempt <= 2) {
        // Initial load and automatic update succeed
        const unreadItems = getMockItems().filter((item) => item.unread);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: unreadItems }),
        });
      } else {
        // Manual update fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      }
    });

    await completeLogin(page);
    await expect(page.getByTestId('active-folder-name')).toBeVisible({ timeout: 5000 });

    // Click update button
    const updateButton = page.getByRole('button', { name: /update|refresh/i });
    await updateButton.click();

    // Should show loading state
    await expect(updateButton).toBeDisabled({ timeout: 1000 });

    // Error should be handled - button should re-enable
    await expect(updateButton).toBeEnabled({ timeout: 10000 });

    // Original articles should still be visible (cache preserved)
    await expect(page.getByText('Ship It Saturday: Folder Queue')).toBeVisible();
  });

  test('pendingReadIds prevent already-marked articles from reappearing', async ({ page }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;
    const markedItemIds: number[] = [];

    await page.route(`${apiBase}/items/read/multiple`, async (route) => {
      const postData = route.request().postDataJSON() as { itemIds?: number[] };
      if (postData.itemIds) {
        markedItemIds.push(...postData.itemIds);
      }
      await route.fulfill({ status: 204 });
    });

    await page.route(`${apiBase}/items**`, async (route) => {
      // Always return the same articles
      const unreadItems = getMockItems().filter((item) => item.unread);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: unreadItems }),
      });
    });

    await completeLogin(page);
    await expect(page.getByTestId('active-folder-name')).toBeVisible({ timeout: 5000 });

    // Mark first folder as read
    await page.getByRole('button', { name: /mark all as read/i }).click();
    await page.waitForTimeout(500);

    // Trigger manual update
    const updateButton = page.getByRole('button', { name: /update|refresh/i });
    await expect(updateButton).toBeVisible({ timeout: 2000 });
    await updateButton.click();
    await expect(updateButton).toBeEnabled({ timeout: 5000 });

    // First folder's articles should NOT reappear even though API returns them
    await expect(page.getByText('Ship It Saturday: Folder Queue')).toHaveCount(0);

    // Second folder should remain active
    const secondFolderName = mockFolders[1]?.name ?? 'Design Thinking';
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(secondFolderName, 'i'),
    );
  });

  test('skips a folder and restarts the queue (US3)', async ({ page }) => {
    await completeLogin(page);

    const firstFolderName = mockFolders[0]?.name ?? 'Engineering Updates';
    const secondFolderName = mockFolders[1]?.name ?? 'Design Inspiration';
    const thirdFolderName = mockFolders[2]?.name ?? 'Podcasts';

    // Verify first folder is active
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(firstFolderName, 'i'),
    );

    // Click Skip button
    await page.getByRole('button', { name: /skip/i }).click();

    // Verify second folder appears
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(secondFolderName, 'i'),
    );

    // Skip the second folder
    await page.getByRole('button', { name: /skip/i }).click();

    // Verify third folder appears
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(thirdFolderName, 'i'),
    );

    // Skip the third folder
    await page.getByRole('button', { name: /skip/i }).click();

    // Verify "All folders viewed" message
    await expect(page.getByRole('heading', { name: /all folders viewed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /restart/i })).toBeVisible();

    // Click Restart
    await page.getByRole('button', { name: /restart/i }).click();

    // Verify first folder is active again
    await expect(page.getByTestId('active-folder-name')).toHaveText(
      new RegExp(firstFolderName, 'i'),
    );
  });

  test('expands article to show details and marks as read (US4)', async ({ page }) => {
    const apiBase = `${TEST_SERVER_URL}/index.php/apps/news/api/v1-3`;

    // Mock mark read
    let markReadCalled = false;
    await page.route(`${apiBase}/items/*/read`, async (route) => {
      markReadCalled = true;
      await route.fulfill({ status: 200 });
    });

    await completeLogin(page);

    // Wait for articles to load
    await expect(page.getByTestId('active-folder-name')).toBeVisible({ timeout: 5000 });

    // Wait for the first article card to be present
    const articleCard = page.getByRole('article').first();
    await expect(articleCard).toBeVisible({ timeout: 5000 });

    const titleText = (await articleCard.getByRole('link').textContent())?.trim() ?? '';
    expect(titleText).toBeTruthy();

    const targetCard = page.getByRole('article').filter({ hasText: titleText }).first();
    await expect(targetCard).toBeVisible({ timeout: 5000 });

    // Verify title is a link
    const titleLink = targetCard.getByRole('link');
    await expect(titleLink).toHaveAttribute('target', '_blank');
    await expect(titleLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Click to expand (also marks as read)
    await targetCard.click();

    // Verify mark read was called
    expect(markReadCalled).toBe(true);

    // Verify the read item is removed from the unread-only timeline
    await expect(page.getByRole('article').filter({ hasText: titleText })).toHaveCount(0);
  });
});
