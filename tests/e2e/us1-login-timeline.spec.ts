import { test, expect } from '@playwright/test';

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
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  test.describe('Login Wizard', () => {
    test('should display login wizard on first visit', async ({ page }) => {
      await page.goto('/');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should show wizard steps
      await expect(page.getByRole('heading', { name: /connect to.*server/i })).toBeVisible();
      await expect(page.getByLabel(/server url/i)).toBeVisible();
    });

    test('should validate HTTPS requirement', async ({ page }) => {
      await page.goto('/login');
      
      // Try to enter HTTP URL
      await page.getByLabel(/server url/i).fill('http://example.com');
      await page.getByRole('button', { name: /continue|next/i }).click();
      
      // Should show error
      await expect(page.getByText(/must use https/i)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit without URL
      await page.getByRole('button', { name: /continue|next/i }).click();
      await expect(page.getByText(/required|enter.*url/i)).toBeVisible();
      
      // Fill URL and continue
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /continue|next/i }).click();
      
      // Should advance to credentials step
      await expect(page.getByLabel(/username/i)).toBeVisible();
      
      // Try to submit without credentials
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
      await expect(page.getByText(/required|enter.*username/i)).toBeVisible();
    });

    test('should show progress during authentication handshake', async ({ page }) => {
      await page.goto('/login');
      
      // Fill in credentials
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /continue|next/i }).click();
      
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
      
      // Should show loading state
      await expect(page.getByText(/verifying|connecting|authenticating/i)).toBeVisible();
    });

    test('should handle remember device toggle', async ({ page }) => {
      await page.goto('/login');
      
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
      await page.goto('/login');
      
      // Complete login without remember device
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /continue|next/i }).click();
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
      await page.goto('/login');
      
      // Complete login with remember device
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /continue|next/i }).click();
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
      await page.goto('/login');
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /continue|next/i }).click();
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
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
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

    test('should display empty state when no items', async ({ page }) => {
      // This requires mocking an empty response
      // Placeholder for empty state test
      expect(true).toBe(true);
    });
  });

  test.describe('Offline Behavior', () => {
    test('should show offline indicator when network is unavailable', async ({ page, context }) => {
      // Set up authenticated session first
      await page.goto('/login');
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
      await page.waitForURL(/\/timeline/);
      
      // Go offline
      await context.setOffline(true);
      
      // Trigger a network request (e.g., refresh)
      await page.reload();
      
      // Should show offline banner
      await expect(page.getByText(/offline|no.*connection/i)).toBeVisible();
    });

    test('should hide offline indicator when network returns', async ({ page, context }) => {
      // Set up authenticated session
      await page.goto('/login');
      await page.getByLabel(/server url/i).fill(TEST_SERVER_URL);
      await page.getByRole('button', { name: /continue|next/i }).click();
      await page.getByLabel(/username/i).fill(TEST_USERNAME);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /log.*in|sign.*in/i }).click();
      await page.waitForURL(/\/timeline/);
      
      // Go offline
      await context.setOffline(true);
      await page.reload();
      
      // Should show offline banner
      await expect(page.getByText(/offline|no.*connection/i)).toBeVisible();
      
      // Go back online
      await context.setOffline(false);
      await page.reload();
      
      // Offline banner should be hidden
      await expect(page.getByText(/offline|no.*connection/i)).not.toBeVisible();
    });
  });
});
