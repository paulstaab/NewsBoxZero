/**
 * Playwright route interception for mocking API calls in E2E tests.
 * Uses similar data structures as MSW handlers but via Playwright's route API.
 */

import { type Page, type Route } from '@playwright/test';

// Mock data matching MSW handlers
export const mockFolders = [
  { id: 1, name: 'Tech News' },
  { id: 2, name: 'Blogs' },
];

export const mockFeeds = [
  {
    id: 1,
    url: 'https://example.com/feed.xml',
    title: 'Example Blog',
    faviconLink: 'https://example.com/favicon.ico',
    added: 1702200000,
    folderId: 1,
    link: 'https://example.com',
    pinned: false,
  },
  {
    id: 2,
    url: 'https://tech.example.com/rss',
    title: 'Tech Daily',
    faviconLink: null,
    added: 1702100000,
    folderId: 1,
    link: 'https://tech.example.com',
    pinned: true,
  },
];

export const mockItems = [
  {
    id: 101,
    title: 'Breaking: New RSS Reader Released',
    content: '<p>A new static RSS reader has been released...</p>',
    author: 'Jane Doe',
    body: '<p>A new static RSS reader has been released...</p>',
    feedId: 1,
    guid: 'https://example.com/posts/101',
    pubDate: 1702199000,
    starred: false,
    unread: true,
    url: 'https://example.com/posts/101',
  },
  {
    id: 102,
    title: 'Understanding Static Site Generation',
    content: '<p>Static site generation is becoming increasingly popular...</p>',
    author: 'John Smith',
    body: '<p>Static site generation is becoming increasingly popular...</p>',
    feedId: 2,
    guid: 'https://tech.example.com/posts/102',
    pubDate: 1702198000,
    starred: false,
    unread: true,
    url: 'https://tech.example.com/posts/102',
  },
  {
    id: 103,
    title: 'Web Performance Best Practices',
    content: '<p>Learn how to optimize your web applications...</p>',
    author: 'Jane Doe',
    body: '<p>Learn how to optimize your web applications...</p>',
    feedId: 1,
    guid: 'https://example.com/posts/103',
    pubDate: 1702197000,
    starred: true,
    unread: false,
    url: 'https://example.com/posts/103',
  },
];

/**
 * Set up API mocks for E2E tests using Playwright route interception.
 */
export async function setupApiMocks(page: Page, baseUrl: string = 'https://rss.example.com') {
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
    const auth = request.headers()['authorization'];

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
  await page.route(`${apiBase}/items**`, async (route: Route) => {
    const request = route.request();
    const auth = request.headers()['authorization'];

    if (auth !== 'Basic dGVzdHVzZXI6dGVzdHBhc3M=') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
      return;
    }

    const url = new URL(request.url());
    const getRead = url.searchParams.get('getRead') !== 'false';

    // Filter items based on getRead parameter
    const filteredItems = getRead ? mockItems : mockItems.filter((item) => item.unread);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: filteredItems }),
    });
  });

  // Mock folders endpoint
  await page.route(`${apiBase}/folders`, async (route: Route) => {
    const request = route.request();
    const auth = request.headers()['authorization'];

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
export async function setupUnreachableServer(
  page: Page,
  baseUrl: string = 'https://rss.example.com',
) {
  const apiPath = '/index.php/apps/news/api/v1-3';
  const apiBase = `${baseUrl}${apiPath}`;

  await page.route(`${apiBase}/**`, async (route: Route) => {
    await route.abort('failed');
  });
}

/**
 * Set up mock for invalid API path (404).
 */
export async function setupInvalidApiPath(page: Page, baseUrl: string = 'https://rss.example.com') {
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
