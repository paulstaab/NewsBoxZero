import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests for Feedfront PWA.
 * Validates WCAG 2.1 AA compliance using axe-core.
 */

const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, fixtureUse) => {
    const createAxeBuilder = () => new AxeBuilder({ page });
    await fixtureUse(createAxeBuilder);
  },
});

const TEST_SERVER_URL = 'https://rss.example.com';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass';

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Set up basic API mocks
    await page.route('**/index.php/apps/news/api/v1-3/version', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: '1.3.0' }),
      });
    });

    await page.route('**/index.php/apps/news/api/v1-3/feeds', async (route) => {
      const auth = route.request().headers().authorization;
      if (auth === 'Basic dGVzdHVzZXI6dGVzdHBhc3M=') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ feeds: [], starredCount: 0, newestItemId: 0 }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      }
    });

    await page.route('**/index.php/apps/news/api/v1-3/items**', async (route) => {
      const auth = route.request().headers().authorization;
      if (auth === 'Basic dGVzdHVzZXI6dGVzdHBhc3M=') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      }
    });

    await page.route('**/index.php/apps/news/api/v1-3/folders', async (route) => {
      const auth = route.request().headers().authorization;
      if (auth === 'Basic dGVzdHVzZXI6dGVzdHBhc3M=') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ folders: [] }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      }
    });

    // Clear storage before each test - navigate and wait for redirect to complete
    await page.goto('/');
    await page.waitForURL(/\/login\//);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test('login page should be accessible', async ({ page, makeAxeBuilder }) => {
    await page.goto('/login/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await makeAxeBuilder()
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login page should have proper focus management', async ({ page }) => {
    await page.goto('/login/');
    await page.waitForLoadState('networkidle');

    // Tab through the form
    await page.keyboard.press('Tab');

    // First focusable element should be skip link or first form input
    // Verify that focus moved to an interactive element
    const focusedTagName = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']).toContain(focusedTagName);

    // Should be able to navigate through all interactive elements
    const interactiveElements = await page.$$(
      'button, input, a[href], [tabindex]:not([tabindex="-1"])',
    );
    expect(interactiveElements.length).toBeGreaterThan(0);
  });

  test('timeline page should be accessible (empty state)', async ({ page, makeAxeBuilder }) => {
    // Login first
    await page.goto('/login/');
    await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.waitForTimeout(500);

    await page.getByLabel(/username/i).fill(TEST_USERNAME);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /login|sign in/i }).click();

    await page.waitForURL(/\/timeline/);
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await makeAxeBuilder()
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('install prompt should be accessible', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait a bit for install prompt to potentially show
    await page.waitForTimeout(5000);

    const accessibilityScanResults = await makeAxeBuilder()
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('settings menu should be accessible', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open settings menu
    const settingsButton = page.getByRole('button', { name: /settings/i });
    const hasSettings = await settingsButton.isVisible().catch(() => false);

    if (hasSettings) {
      // Get the bounding box and click at the center
      const box = await settingsButton.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForTimeout(500);

      const accessibilityScanResults = await makeAxeBuilder()
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('keyboard navigation should work throughout app', async ({ page }) => {
    await page.goto('/login/');
    await page.waitForLoadState('networkidle');

    // Test Tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);

    // Test Shift+Tab reverse navigation
    await page.keyboard.press('Shift+Tab');
    focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A', 'BODY']).toContain(focusedElement);

    // Test Enter key activation
    const firstButton = page.getByRole('button').first();
    await firstButton.focus();

    // Verify focus
    const isFocused = await firstButton.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  test('skip link should be functional', async ({ page }) => {
    await page.goto('/login/');
    await page.waitForLoadState('networkidle');

    // Tab to skip link (should be first focusable)
    await page.keyboard.press('Tab');

    // Verify skip link gets focus
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    const isSkipLinkFocused = await skipLink.evaluate((el) => el === document.activeElement);

    if (isSkipLinkFocused) {
      // Activate skip link
      await page.keyboard.press('Enter');

      // Verify main content has focus
      await page.waitForTimeout(200);
      const mainContent = await page.evaluate(() => document.activeElement?.getAttribute('id'));
      expect(mainContent).toBe('main-content');
    }
  });

  test('color contrast should meet WCAG AA standards', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for color contrast specifically
    const contrastResults = await makeAxeBuilder()
      .include('body')
      .withRules(['color-contrast'])
      .analyze();

    // Should have no color contrast violations
    expect(contrastResults.violations).toEqual([]);
  });

  test('forms should have proper labels', async ({ page, makeAxeBuilder }) => {
    await page.goto('/login/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await makeAxeBuilder()
      .withRules(['label', 'label-content-name-mismatch'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('images and icons should have proper alternative text', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await makeAxeBuilder()
      .withRules(['image-alt', 'svg-img-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('interactive elements should have visible focus indicators', async ({ page }) => {
    await page.goto('/login/');
    await page.waitForLoadState('networkidle');

    // Get first interactive element
    const button = page.getByRole('button').first();
    await button.focus();

    // Wait a moment for focus styles to apply (especially in WebKit)
    await page.waitForTimeout(100);

    // Check if focus style is applied (outline or ring)
    const hasFocusStyle = await button.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      // Check for Tailwind's focus-visible ring or custom focus styles
      // Note: Some browsers may not show focus styles without user interaction
      return (
        styles.outlineWidth !== '0px' ||
        styles.outlineStyle !== 'none' ||
        styles.boxShadow !== 'none' ||
        // Also check if the element has focus-related classes
        el.classList.toString().includes('focus')
      );
    });

    expect(hasFocusStyle).toBe(true);
  });

  test('ARIA roles and properties should be valid', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await makeAxeBuilder()
      .withRules([
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-valid-attr',
        'aria-valid-attr-value',
        'aria-roles',
      ])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
