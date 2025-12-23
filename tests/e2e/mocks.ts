/**
 * Playwright route interception for mocking API calls in E2E tests.
 * Uses similar data structures as MSW handlers but via Playwright's route API.
 */

import { type Page, type Route } from '@playwright/test';

// Mock data matching MSW handlers
export const mockFolders = [
  { id: 10, name: 'Engineering Updates', feeds: [101, 102] },
  { id: 20, name: 'Design Inspiration', feeds: [201] },
  { id: 30, name: 'Podcasts', feeds: [301] },
];

export const mockFeeds = [
  {
    id: 101,
    url: 'https://frontend.example.com/rss',
    title: 'Frontend Focus',
    faviconLink: 'https://frontend.example.com/favicon.ico',
    added: 1702200000,
    folderId: 10,
    link: 'https://frontend.example.com',
    pinned: false,
  },
  {
    id: 102,
    url: 'https://backend.example.com/rss',
    title: 'Backend Briefing',
    faviconLink: 'https://backend.example.com/favicon.ico',
    added: 1702105000,
    folderId: 10,
    link: 'https://backend.example.com',
    pinned: false,
  },
  {
    id: 201,
    url: 'https://design.example.com/rss',
    title: 'Design Notes',
    faviconLink: null,
    added: 1702000000,
    folderId: 20,
    link: 'https://design.example.com',
    pinned: true,
  },
  {
    id: 301,
    url: 'https://podcasts.example.com/rss',
    title: 'The Pod Stack',
    faviconLink: 'https://podcasts.example.com/icon.png',
    added: 1701900000,
    folderId: 30,
    link: 'https://podcasts.example.com',
    pinned: false,
  },
];

export function getMockItems() {
  return [
    {
      id: 1001,
      title: 'Ship It Saturday: Folder Queue',
      content: '<p>Engineering just shipped the folder queue feature.</p>',
      author: 'Platform Team',
      body: '<p>Engineering just shipped the folder queue feature.</p>',
      feedId: 101,
      folderId: 10,
      guid: 'https://frontend.example.com/posts/folder-queue',
      guidHash: 'hash1001',
      pubDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      lastModified: Math.floor(Date.now() / 1000) - 3600,
      starred: false,
      unread: true,
      url: 'https://frontend.example.com/posts/folder-queue',
      enclosureLink: null,
      enclosureMime: null,
      fingerprint: 'fp1001',
      contentHash: 'ch1001',
      mediaThumbnail: null,
      mediaDescription: null,
      rtl: false,
    },
    {
      id: 1002,
      title: 'Accessibility Improvements Rolling Out',
      content: '<p>New keyboard shortcuts now live.</p>',
      author: 'Accessibility Guild',
      body: '<p>New keyboard shortcuts now live.</p>',
      feedId: 102,
      folderId: 10,
      guid: 'https://backend.example.com/posts/accessibility',
      guidHash: 'hash1002',
      pubDate: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      lastModified: Math.floor(Date.now() / 1000) - 7200,
      starred: false,
      unread: true,
      url: 'https://backend.example.com/posts/accessibility',
      enclosureLink: null,
      enclosureMime: null,
      fingerprint: 'fp1002',
      contentHash: 'ch1002',
      mediaThumbnail: null,
      mediaDescription: null,
      rtl: false,
    },
    {
      id: 1003,
      title: 'Observability Deep Dive',
      content: '<p>Tracing the folder queue pipeline end to end.</p>',
      author: 'Infra Team',
      body: '<p>Tracing the folder queue pipeline end to end.</p>',
      feedId: 101,
      folderId: 10,
      guid: 'https://frontend.example.com/posts/observability',
      guidHash: 'hash1003',
      pubDate: Math.floor(Date.now() / 1000) - 10800, // 3 hours ago
      lastModified: Math.floor(Date.now() / 1000) - 10800,
      starred: false,
      unread: true,
      url: 'https://frontend.example.com/posts/observability',
      enclosureLink: null,
      enclosureMime: null,
      fingerprint: 'fp1003',
      contentHash: 'ch1003',
      mediaThumbnail: null,
      mediaDescription: null,
      rtl: false,
    },
    {
      id: 2001,
      title: 'Color Systems for 2025',
      content: '<p>Exploring new gradient tokens.</p>',
      author: 'Design Systems',
      body: '<p>Exploring new gradient tokens.</p>',
      feedId: 201,
      folderId: 20,
      guid: 'https://design.example.com/posts/colors-2025',
      guidHash: 'hash2001',
      pubDate: Math.floor(Date.now() / 1000) - 14400, // 4 hours ago
      lastModified: Math.floor(Date.now() / 1000) - 14400,
      starred: false,
      unread: true,
      url: 'https://design.example.com/posts/colors-2025',
      enclosureLink: null,
      enclosureMime: null,
      fingerprint: 'fp2001',
      contentHash: 'ch2001',
      mediaThumbnail: null,
      mediaDescription: null,
      rtl: false,
    },
    {
      id: 2002,
      title: 'Motion Studies: Folder Stepper',
      content: '<p>Documenting the folder stepper animation curves.</p>',
      author: 'Motion Lab',
      body: '<p>Documenting the folder stepper animation curves.</p>',
      feedId: 201,
      folderId: 20,
      guid: 'https://design.example.com/posts/motion-folder-stepper',
      guidHash: 'hash2002',
      pubDate: Math.floor(Date.now() / 1000) - 18000, // 5 hours ago
      lastModified: Math.floor(Date.now() / 1000) - 18000,
      starred: false,
      unread: true,
      url: 'https://design.example.com/posts/motion-folder-stepper',
      enclosureLink: null,
      enclosureMime: null,
      fingerprint: 'fp2002',
      contentHash: 'ch2002',
      mediaThumbnail: null,
      mediaDescription: null,
      rtl: false,
    },
    {
      id: 3001,
      title: 'Pod Stack Episode 42',
      content: '<p>Discussing offline-first UX wins.</p>',
      author: 'Hosts',
      body: '<p>Discussing offline-first UX wins.</p>',
      feedId: 301,
      folderId: 30,
      guid: 'https://podcasts.example.com/episodes/42',
      guidHash: 'hash3001',
      pubDate: Math.floor(Date.now() / 1000) - 21600, // 6 hours ago
      lastModified: Math.floor(Date.now() / 1000) - 21600,
      starred: false,
      unread: true,
      url: 'https://podcasts.example.com/episodes/42',
      enclosureLink: null,
      enclosureMime: null,
      fingerprint: 'fp3001',
      contentHash: 'ch3001',
      mediaThumbnail: null,
      mediaDescription: null,
      rtl: false,
    },
  ];
}

// Backward compatibility: export mockItems as the result of calling getMockItems()
export const mockItems = getMockItems();

/**
 * Set up API mocks for E2E tests using Playwright route interception.
 */
export async function setupApiMocks(page: Page, baseUrl = 'https://rss.example.com') {
  const apiPath = '/index.php/apps/news/api/v1-3';
  const apiBase = `${baseUrl}${apiPath}`;

  // Mock version endpoint (no auth required)
  await page.route(`${apiBase}/version`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ version: '1.3.0' }),
    });
  });

  // Mock feeds endpoint
  await page.route(`${apiBase}/feeds`, async (route: Route) => {
    const request = route.request();
    const auth = request.headers().authorization;

    // Check for valid auth
    if (auth !== 'Basic dGVzdHVzZXI6dGVzdHBhc3M=') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        feeds: mockFeeds,
        starredCount: 1,
        newestItemId: 103,
      }),
    });
  });

  // Mock items endpoint
  // Per Core Principle VI (Unread-Only Focus), API MUST return only unread articles
  await page.route(`${apiBase}/items**`, async (route: Route) => {
    const request = route.request();
    const auth = request.headers().authorization;

    if (auth !== 'Basic dGVzdHVzZXI6dGVzdHBhc3M=') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

    // Always return fresh unread items - constitution mandates unread-only focus
    // Use getMockItems() to prevent state leakage between tests
    const unreadItems = getMockItems().filter((item) => item.unread);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: unreadItems }),
    });
  });

  // Mock folders endpoint
  await page.route(`${apiBase}/folders`, async (route: Route) => {
    const request = route.request();
    const auth = request.headers().authorization;

    if (auth !== 'Basic dGVzdHVzZXI6dGVzdHBhc3M=') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ folders: mockFolders }),
    });
  });
}

/**
 * Set up mock for unreachable server (network error).
 */
export async function setupUnreachableServer(page: Page, baseUrl = 'https://rss.example.com') {
  const apiPath = '/index.php/apps/news/api/v1-3';
  const apiBase = `${baseUrl}${apiPath}`;

  await page.route(`${apiBase}/**`, async (route: Route) => {
    await route.abort('failed');
  });
}

/**
 * Set up mock for invalid API path (404).
 */
export async function setupInvalidApiPath(page: Page, baseUrl = 'https://rss.example.com') {
  const apiPath = '/index.php/apps/news/api/v1-3';
  const apiBase = `${baseUrl}${apiPath}`;

  await page.route(`${apiBase}/**`, async (route: Route) => {
    await route.fulfill({
      status: 404,
      contentType: 'text/html',
      body: '<html><body>Not Found</body></html>',
    });
  });
}
