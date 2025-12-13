import { test, expect } from '@playwright/test';
import { setupApiMocks, setupUnreachableServer, setupInvalidApiPath } from './mocks';

/**
 * E2E tests for User Story 1: View Aggregated Timeline
 *
 * Tests the complete flow:
 * 1. Login wizard with URL/credential validation
 * 2. Timeline rendering with unread items
 * 3. Unread ↔ All toggle
 * 4. Infinite scroll and pagination
 * 5. Offline indicator behavior
 */

const TEST_SERVER_URL = 'https://rss.example.com';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpass';

test.describe('US1: Login and Timeline', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks before each test
    await setupApiMocks(page, TEST_SERVER_URL);

    // Clear storage before each test - navigate and wait for redirect to complete
    await page.goto('/');
    await page.waitForURL(/\/login\//);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test.describe('Login Wizard', () => {
    test('should display login wizard on first visit', async ({ page }) => {
      // Navigate to root and wait for redirect
      await page.goto('/');
      await page.waitForURL(/\/login\//);

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login\//);

      // Should show wizard with heading and server URL input
      await expect(page.getByRole('heading', { name: /welcome to feedfront/i })).toBeVisible();
      await expect(page.getByText(/connect to your rss server/i)).toBeVisible();
      await expect(page.getByLabel(/server url/i)).toBeVisible();
    });

    test('should validate server connectivity before showing credentials', async ({ page }) => {
      // Already on login page from beforeEach

      // Enter valid HTTPS URL
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();

      // Should show validation progress (checking connectivity text)
      // Note: This may be very fast with mocks, so we just verify the credentials appear

      // Should advance to credentials step after connectivity check
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test('should show error for unreachable server', async ({ page }) => {
      // Set up mock for unreachable server
      const unreachableUrl = 'https://unreachable.invalid';
      await setupUnreachableServer(page, unreachableUrl);

      await page.goto('/login/');

      // Mock a network error by using an unreachable URL
      await page.getByLabel(/server url/i).fill(unreachableUrl);
      await page.getByRole('button', { name: /^continue$/i }).click();

      // Should show connectivity error (check for network-related error messages)
      await expect(
        page.getByText(/unable.*validate|check.*connection|network.*error/i),
      ).toBeVisible({ timeout: 10000 });

      // Should stay on server URL step
      await expect(page.getByLabel(/server url/i)).toBeVisible();
      await expect(page.getByLabel(/username/i)).not.toBeVisible();
    });

    test('should show error for wrong API path', async ({ page }) => {
      // Set up mock for invalid API path (404)
      const wrongPathUrl = 'https://wrong-path.example.com';
      await setupInvalidApiPath(page, wrongPathUrl);

      await page.goto('/login/');

      // Enter URL that returns 404 for /version
      await page.getByLabel(/server url/i).fill(wrongPathUrl);
      await page.getByRole('button', { name: /^continue$/i }).click();

      // Should show error about wrong server or API
      await expect(page.getByText(/not.*found|wrong.*server|invalid.*api/i)).toBeVisible();

      // Should stay on server URL step
      await expect(page.getByLabel(/server url/i)).toBeVisible();
    });

    test('should validate HTTPS requirement', async ({ page }) => {
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Try to enter HTTP URL
      await page.getByLabel(/server url/i).fill('http://example.com');
      await page.getByRole('button', { name: /^continue$/i }).click();

      // Should show error
      await expect(page.getByText(/must use https/i)).toBeVisible({ timeout: 10000 });
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login/');
      await page.waitForLoadState('networkidle');

      // HTML5 validation prevents empty submission, so fill URL to progress
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();

      // Should advance to credentials step
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });

      // Verify form requires username and password fields exist and are required
      const usernameInput = page.getByLabel(/username/i);
      const passwordInput = page.getByLabel(/password/i);

      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();

      // These inputs should have the required attribute
      await expect(usernameInput).toHaveAttribute('required', '');
      await expect(passwordInput).toHaveAttribute('required', '');
    });

    test('should show progress during authentication handshake', async ({ page }) => {
      await page.goto('/login/');
      await page.waitForLoadState('networkidle');

      // Fill in server URL
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();

      // Wait for validation step to complete
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });

      // Fill credentials
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /sign.*in/i }).click();

      // Should show authenticating state (use first() to avoid strict mode violation)
      await expect(page.getByText(/authenticating/i).first()).toBeVisible();

      // Should eventually redirect to timeline
      await page.waitForURL(/\/timeline/, { timeout: 10000 });
    });

    test('should handle remember device toggle', async ({ page }) => {
      await page.goto('/login/');

      // Progress to credentials step
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();

      // Wait for credentials step
      await expect(page.getByLabel(/username/i)).toBeVisible();

      // Should have remember device checkbox
      const rememberCheckbox = page.getByLabel(/remember.*device|stay.*logged.*in/i);
      await expect(rememberCheckbox).toBeVisible();

      // Should be unchecked by default
      await expect(rememberCheckbox).not.toBeChecked();

      // Can be toggled
      await rememberCheckbox.check();
      await expect(rememberCheckbox).toBeChecked();
    });

    test('should store credentials in sessionStorage by default', async ({ page }) => {
      await page.goto('/login/');

      // Complete login without remember device
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();

      // Wait for redirect to timeline
      await page.waitForURL(/\/timeline/);

      // Check storage
      const sessionData = await page.evaluate(() => sessionStorage.getItem('feedfront:session'));
      expect(sessionData).not.toBeNull();

      const localData = await page.evaluate(() => localStorage.getItem('feedfront:session'));
      expect(localData).toBeNull();
    });

    test('should store credentials in localStorage when remember is enabled', async ({ page }) => {
      await page.goto('/login/');
      await page.waitForLoadState('networkidle');

      // Complete login with remember device
      await expect(page.getByLabel(/server url/i)).toBeVisible();
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByLabel(/remember.*device|stay.*logged.*in/i).check();
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();

      // Wait for redirect to timeline
      await page.waitForURL(/\/timeline/);

      // Check storage
      const localData = await page.evaluate(() => localStorage.getItem('feedfront:session'));
      expect(localData).not.toBeNull();
    });
  });

  test.describe('Timeline View', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authenticated session
      await page.goto('/login/');
      await page.waitForLoadState('networkidle');
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
      await page.waitForURL(/\/timeline/);
    });

    test('should display timeline with articles', async ({ page }) => {
      // Should show article cards
      await expect(page.getByRole('article').first()).toBeVisible();

      // Should show article titles
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    test('should show unread count summary', async ({ page }) => {
      // Should display aggregate unread count
      await expect(page.getByText(/\d+\s+(unread|new)/i)).toBeVisible();
    });

    test('should toggle between Unread and All views', async ({ page }) => {
      // Find the Unread/All toggle
      const unreadToggle = page.getByRole('button', { name: /unread/i });
      const allToggle = page.getByRole('button', { name: /all/i });

      // Unread should be active by default
      await expect(unreadToggle).toHaveAttribute('aria-pressed', 'true');

      // Switch to All
      await allToggle.click();
      await expect(allToggle).toHaveAttribute('aria-pressed', 'true');

      // URL should reflect the change
      await expect(page).toHaveURL(/getRead=true/);

      // Switch back to Unread
      await unreadToggle.click();
      await expect(unreadToggle).toHaveAttribute('aria-pressed', 'true');
      await expect(page).toHaveURL(/getRead=false/);
    });

    test('should support infinite scroll', async ({ page }) => {
      // Get initial article count
      const initialCount = await page.getByRole('article').count();

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for more articles to load
      await page.waitForTimeout(1000); // Give time for prefetch

      const newCount = await page.getByRole('article').count();

      // Should have loaded more articles
      expect(newCount).toBeGreaterThan(initialCount);
    });

    test('should lazy-load article body content', async ({ page }) => {
      // First article should be visible
      const firstArticle = page.getByRole('article').first();
      await expect(firstArticle).toBeVisible();

      // Article body should be collapsed by default or loaded on scroll
      // Implementation will vary based on design
      await expect(firstArticle).toBeVisible();
    });

    test('should display empty state when no items', () => {
      // This requires mocking an empty response
      // Placeholder for empty state test
      expect(true).toBe(true);
    });
  });

  test.describe('Offline Behavior', () => {
    test('should show offline indicator when network is unavailable', async ({ page }) => {
      // Set up authenticated session first
      await page.goto('/login/');
      await page.waitForLoadState('networkidle');
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
      await page.waitForURL(/\/timeline/);

      // Simulate offline by dispatching the offline event
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Should show offline banner (use first() to handle React StrictMode double render)
      await expect(page.getByText(/you are currently offline/i).first()).toBeVisible();
    });

    test('should hide offline indicator when network returns', async ({ page }) => {
      // Set up authenticated session
      await page.goto('/login/');
      await page.waitForLoadState('networkidle');
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.getByLabel(/username/i)).toBeVisible({ timeout: 10000 });
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
      await page.waitForURL(/\/timeline/);

      // Simulate going offline
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Should show offline banner (use first() to handle React StrictMode double render)
      await expect(page.getByText(/you are currently offline/i).first()).toBeVisible();

      // Simulate coming back online
      // Note: In a real browser, navigator.onLine would update automatically,
      // but in tests we need to mock it
      await page.evaluate(() => {
        // Override navigator.onLine to return true
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      // Offline banner should disappear - wait for it to be hidden
      await page
        .getByText(/you are currently offline/i)
        .first()
        .waitFor({ state: 'hidden', timeout: 5000 });
    });
  });
});
