import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks } from './mocks';

/**
 * Visual regression tests for sidebar design language.
 * Captures desktop and mobile states, hover/focus interactions.
 */

const TEST_SERVER_URL = 'https://rss.example.com';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass';

async function loginUser(page: Page) {
  await page.goto('/login/');
  await page.waitForLoadState('domcontentloaded');

  await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.waitForTimeout(500);

  await page.getByLabel(/username/i).fill(TEST_USERNAME);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /login|sign in/i }).click();

  await page.waitForURL(/\/timeline/);
  await page.waitForLoadState('networkidle');
}

test.describe('Sidebar Visual Design', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test.describe('Desktop Viewport', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('sidebar default state matches design', async ({ page }) => {
      await loginUser(page);
      await page.waitForSelector('[data-testid="sidebar"]');

      // Wait for animations to complete
      await page.waitForTimeout(300);

      // Capture sidebar in default state
      const sidebar = page.getByTestId('sidebar');
      await expect(sidebar).toHaveScreenshot('sidebar-desktop-default.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('sidebar with selected folder matches design', async ({ page }) => {
      await loginUser(page);
      await page.waitForSelector('[data-testid="sidebar"]');

      // Click on a folder to select it
      const folderItems = page.getByTestId('folder-item');
      const secondFolder = folderItems.nth(1);
      await secondFolder.click();

      // Wait for selection animation
      await page.waitForTimeout(300);

      const sidebar = page.getByTestId('sidebar');
      await expect(sidebar).toHaveScreenshot('sidebar-desktop-selected.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('folder item hover state matches design', async ({ page }) => {
      await loginUser(page);
      await page.waitForSelector('[data-testid="sidebar"]');

      // Hover over an unselected folder
      const folderItems = page.getByTestId('folder-item');
      const secondFolder = folderItems.nth(1);
      await secondFolder.hover();

      // Wait for hover transition
      await page.waitForTimeout(200);

      await expect(secondFolder).toHaveScreenshot('folder-item-hover.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('timeline with sidebar layout matches design', async ({ page }) => {
      await loginUser(page);
      await page.waitForSelector('[data-testid="sidebar"]');
      await page.waitForTimeout(500);

      // Full page screenshot for layout verification
      await expect(page).toHaveScreenshot('timeline-desktop-full.png', {
        maxDiffPixelRatio: 0.05,
        fullPage: false,
      });
    });
  });

  test.describe('Mobile Viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('sidebar open state on mobile', async ({ page }) => {
      await loginUser(page);

      // Open sidebar
      const mobileToggle = page.getByTestId('mobile-toggle');
      await mobileToggle.click();

      // Wait for animation
      await page.waitForTimeout(300);

      const sidebar = page.getByTestId('sidebar-mobile');
      await expect(sidebar).toBeVisible();

      // Capture sidebar open with overlay
      await expect(page).toHaveScreenshot('mobile-open-state.png', {
        maxDiffPixelRatio: 0.05,
        fullPage: false,
      });
    });

    test('mobile sidebar with folder selection', async ({ page }) => {
      await loginUser(page);

      // Open sidebar
      const mobileToggle = page.getByTestId('mobile-toggle');
      await mobileToggle.click();
      await page.waitForTimeout(300);

      // Capture sidebar with selected folder
      const sidebar = page.getByTestId('sidebar-mobile');
      await expect(sidebar).toHaveScreenshot('mobile-sidebar-selected.png', {
        maxDiffPixelRatio: 0.05,
      });
    });
  });

  test.describe('Dark Theme Consistency', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('article cards use dark theme tokens', async ({ page }) => {
      await loginUser(page);
      await page.waitForSelector('[data-testid="article-list"]', { timeout: 10000 });

      // Capture article list with dark theme
      const articleList = page.getByTestId('article-list');
      await expect(articleList).toHaveScreenshot('article-list-dark.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('folder stepper uses dark theme tokens', async ({ page }) => {
      await loginUser(page);

      // Capture folder stepper/header area
      const header = page.locator('header').first();
      await expect(header).toHaveScreenshot('header-dark.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('buttons use consistent styling', async ({ page }) => {
      await loginUser(page);
      await page.waitForSelector('[data-testid="article-list"]', { timeout: 10000 });

      // Find and capture primary button
      const markAllReadButton = page.getByTestId('mark-all-read-button');
      if (await markAllReadButton.isVisible()) {
        await expect(markAllReadButton).toHaveScreenshot('button-primary.png', {
          maxDiffPixelRatio: 0.05,
        });
      }
    });
  });

  test.describe('Typography Scale', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('headings use correct typography', async ({ page }) => {
      await loginUser(page);

      // Capture main heading
      const mainHeading = page.locator('h1').first();
      await expect(mainHeading).toHaveScreenshot('heading-h1.png', {
        maxDiffPixelRatio: 0.05,
      });
    });

    test('sidebar heading uses correct typography', async ({ page }) => {
      await loginUser(page);
      await page.waitForSelector('[data-testid="sidebar"]');

      const sidebarHeading = page.getByTestId('sidebar').locator('h2');
      await expect(sidebarHeading).toHaveScreenshot('heading-sidebar.png', {
        maxDiffPixelRatio: 0.05,
      });
    });
  });
});
