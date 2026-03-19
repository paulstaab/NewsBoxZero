import { expect, test } from '@playwright/test';
import { setupApiMocks } from './mocks';

const TEST_SERVER_URL = 'https://rss.example.com';
const storageStatePath = 'tests/e2e/.auth/user.json';

test.describe('Feed Management Page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await setupApiMocks(page, TEST_SERVER_URL);
    await page.goto('/feeds');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('authenticated flows', () => {
    test.use({ storageState: storageStatePath });

    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page, TEST_SERVER_URL);
    });

    test('burger menu links to feed management as the first entry', async ({ page }) => {
      await page.goto('/timeline');
      const menuButton = page.getByRole('button', { name: /burger menu/i });
      await menuButton.evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
      await expect(page.getByRole('menuitem').first()).toHaveText(/feed management/i);
      await page.getByRole('menuitem', { name: /feed management/i }).evaluate((element) => {
        (element as HTMLAnchorElement).click();
      });

      await page.waitForURL(/\/feeds/);
      await expect(
        page.getByRole('heading', { name: /manage subscriptions and folders/i }),
      ).toBeVisible();
    });

    test('floating add button and plus hotkey open the add-feed modal', async ({ page }) => {
      await page.goto('/feeds');

      await page.getByRole('button', { name: /add feed/i }).click();
      await expect(
        page.getByRole('heading', { name: /add a feed to your reading queue/i }),
      ).toBeVisible();
      await page.getByRole('button', { name: /^cancel$/i }).click();

      await page.keyboard.press('+');
      await expect(
        page.getByRole('heading', { name: /add a feed to your reading queue/i }),
      ).toBeVisible();
    });

    test('supports feed and folder management flows', async ({ page }) => {
      await page.goto('/feeds');
      await expect(
        page.getByRole('heading', { name: /manage subscriptions and folders/i }),
      ).toBeVisible();

      await expect(page.getByText(/feed #101/i)).toBeVisible();
      const podStackRow = page.locator('article', {
        has: page.getByText('The Pod Stack', { exact: true }),
      });
      await expect(podStackRow.getByText(/last article/i)).toBeVisible();
      await expect(podStackRow.getByText(/hours ago/i)).toBeVisible();
      await expect(
        podStackRow.getByText(/in (?:\d+ )?(?:minute|minutes|hour|hours)/i),
      ).toBeVisible();
      await expect(podStackRow.getByTitle('https://podcasts.example.com/rss')).toBeVisible();
      await expect(podStackRow.getByLabel(/update error: connection timeout/i)).toHaveAttribute(
        'title',
        'Connection timeout',
      );

      await page.getByRole('button', { name: /new folder/i }).click();
      await page.getByLabel(/new folder name/i).fill('Announcements');
      await page.getByRole('button', { name: /^create folder$/i }).click();
      await expect(page.getByText(/created folder announcements/i)).toBeVisible();

      await page.getByRole('button', { name: /add feed/i }).click();
      await page.getByLabel(/^feed url$/i).fill('https://alerts.example.com/rss.xml');
      await page.getByLabel(/^destination folder$/i).selectOption({ label: 'Announcements' });
      await page.getByRole('button', { name: /^subscribe$/i }).click();

      const announcementsSection = page.locator('section', {
        has: page.getByRole('heading', { name: 'Announcements' }),
      });
      await expect(
        announcementsSection.getByRole('heading', { name: 'alerts.example.com' }),
      ).toBeVisible();

      await announcementsSection.getByRole('button', { name: /rename folder/i }).click();
      await page.getByLabel(/^folder name$/i).fill('Briefings');
      await page
        .getByRole('button', { name: /^save$/i })
        .first()
        .click();
      await expect(page.getByRole('heading', { name: 'Briefings' })).toBeVisible();

      const renamedSection = page.locator('section', {
        has: page.getByRole('heading', { name: 'Briefings' }),
      });

      await renamedSection.getByRole('button', { name: /rename feed/i }).evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
      await page.getByLabel(/feed name for alerts\.example\.com/i).fill('Alpha Radar');
      await page
        .getByRole('button', { name: /^save$/i })
        .last()
        .click();
      await expect(renamedSection.getByText('Alpha Radar')).toBeVisible();
      await expect(renamedSection.getByTitle('https://alerts.example.com/rss.xml')).toBeVisible();

      await renamedSection
        .getByRole('button', { name: /move alpha radar to another folder/i })
        .click();
      await page.getByLabel(/^target folder$/i).selectOption({ label: 'Uncategorized' });
      await page.getByRole('button', { name: /^move feed$/i }).click();
      const uncategorizedSection = page.locator('section', {
        has: page.getByRole('heading', { name: 'Uncategorized' }),
      });
      await expect(uncategorizedSection.getByText('Alpha Radar')).toBeVisible();

      page.once('dialog', (dialog) => dialog.accept());
      await uncategorizedSection.getByRole('button', { name: /delete feed/i }).click();
      await expect(uncategorizedSection.getByText('Alpha Radar')).not.toBeVisible();

      await page.keyboard.press('+');
      await page.getByLabel(/^feed url$/i).fill('https://briefings.example.com/feed.xml');
      await page.getByLabel(/^destination folder$/i).selectOption({ label: 'Briefings' });
      await page.getByRole('button', { name: /^subscribe$/i }).click();
      await expect(
        renamedSection.getByRole('heading', { name: 'briefings.example.com' }),
      ).toBeVisible();

      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('unsubscribe 1 feed');
        await dialog.accept();
      });
      await renamedSection.getByRole('button', { name: /delete folder/i }).click();

      await expect(page.getByRole('heading', { name: 'Briefings', exact: true })).not.toBeVisible();
      await expect(page.getByRole('heading', { name: 'briefings.example.com' })).not.toBeVisible();
    });
  });
});
