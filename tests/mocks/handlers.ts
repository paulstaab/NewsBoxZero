/**
 * MSW request handlers for Nextcloud News API v1.3.
 * Provides realistic mock data for testing.
 */

import { http, HttpResponse, type HttpHandler } from 'msw';

// Base URL for mock API
const BASE_URL = 'https://nextcloud.example.com/index.php/apps/news/api/v1-3';

// Valid test credentials (base64 of "testuser:testpass")
const VALID_AUTH = 'Basic dGVzdHVzZXI6dGVzdHBhc3M=';

/**
 * Helper to check authorization header.
 */
function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('Authorization');
  return auth === VALID_AUTH;
}

/**
 * Mock folder data.
 */
export const mockFolders = [
  { id: 1, name: 'Tech News' },
  { id: 2, name: 'Blogs' },
  { id: 3, name: 'Podcasts' },
];

/**
 * Mock feed data.
 */
export const mockFeeds = [
  {
    id: 1,
    url: 'https://example.com/feed.xml',
    title: 'Example Blog',
    faviconLink: 'https://example.com/favicon.ico',
    added: 1702200000,
    nextUpdateTime: 1702203600,
    folderId: 1,
    ordering: 0,
    link: 'https://example.com',
    pinned: false,
    updateErrorCount: 0,
    lastUpdateError: null,
  },
  {
    id: 2,
    url: 'https://tech.example.com/rss',
    title: 'Tech Daily',
    faviconLink: null,
    added: 1702100000,
    nextUpdateTime: 1702203600,
    folderId: 1,
    ordering: 1,
    link: 'https://tech.example.com',
    pinned: true,
    updateErrorCount: 0,
    lastUpdateError: null,
  },
  {
    id: 3,
    url: 'https://blog.example.com/feed',
    title: 'Personal Blog',
    faviconLink: 'https://blog.example.com/icon.png',
    added: 1702000000,
    nextUpdateTime: 1702203600,
    folderId: null, // uncategorized
    ordering: 0,
    link: 'https://blog.example.com',
    pinned: false,
    updateErrorCount: 1,
    lastUpdateError: 'Connection timeout',
  },
];

/**
 * Mock article/item data.
 */
export const mockItems = [
  {
    id: 101,
    title: 'Breaking: New RSS Reader Released',
    content: '<p>A new static RSS reader has been released...</p>',
    author: 'Jane Doe',
    body: '<p>A new static RSS reader has been released...</p>',
    contentHash: 'abc123def456',
    enclosureLink: null,
    enclosureMime: null,
    feedId: 1,
    fingerprint: 'fp101',
    guid: 'https://example.com/posts/101',
    guidHash: 'a1b2c3d4e5',
    lastModified: 1702200000,
    mediaDescription: null,
    mediaThumbnail: null,
    pubDate: 1702199000,
    rtl: false,
    starred: false,
    unread: true,
    updatedDate: null,
    url: 'https://example.com/posts/101',
  },
  {
    id: 102,
    title: 'Understanding Modern Web Development',
    content: '<p>Web development continues to evolve...</p>',
    author: 'John Smith',
    body: '<p>Web development continues to evolve...</p>',
    contentHash: 'xyz789abc123',
    enclosureLink: null,
    enclosureMime: null,
    feedId: 1,
    fingerprint: 'fp102',
    guid: 'https://example.com/posts/102',
    guidHash: 'f6g7h8i9j0',
    lastModified: 1702190000,
    mediaDescription: null,
    mediaThumbnail: 'https://example.com/thumb102.jpg',
    pubDate: 1702189000,
    rtl: false,
    starred: true,
    unread: false,
    updatedDate: null,
    url: 'https://example.com/posts/102',
  },
  {
    id: 103,
    title: 'Tech News Roundup',
    content: '<p>This week in tech...</p>',
    author: null,
    body: '<p>This week in tech...</p>',
    contentHash: 'def456ghi789',
    enclosureLink: 'https://tech.example.com/podcast.mp3',
    enclosureMime: 'audio/mpeg',
    feedId: 2,
    fingerprint: 'fp103',
    guid: 'https://tech.example.com/news/103',
    guidHash: 'k1l2m3n4o5',
    lastModified: 1702180000,
    mediaDescription: 'Tech podcast episode',
    mediaThumbnail: null,
    pubDate: 1702179000,
    rtl: false,
    starred: false,
    unread: true,
    updatedDate: null,
    url: 'https://tech.example.com/news/103',
  },
  {
    id: 104,
    title: 'Personal Update: New Project',
    content: '<p>I have started working on a new project...</p>',
    author: 'Blogger',
    body: '<p>I have started working on a new project...</p>',
    contentHash: 'jkl012mno345',
    enclosureLink: null,
    enclosureMime: null,
    feedId: 3,
    fingerprint: 'fp104',
    guid: 'https://blog.example.com/posts/104',
    guidHash: 'p6q7r8s9t0',
    lastModified: 1702170000,
    mediaDescription: null,
    mediaThumbnail: null,
    pubDate: 1702169000,
    rtl: false,
    starred: false,
    unread: true,
    updatedDate: null,
    url: 'https://blog.example.com/posts/104',
  },
];

/**
 * API version info.
 */
export const mockVersion = {
  version: '18.0.0',
  apiLevels: ['v1-3'],
};

/**
 * Request handlers for MSW.
 */
export const handlers: HttpHandler[] = [
  // Legacy health check endpoint
  http.get('https://example.com/health', () => HttpResponse.json({ ok: true })),

  // GET /version - public endpoint (no auth required)
  http.get(`${BASE_URL}/version`, () => {
    return HttpResponse.json(mockVersion);
  }),

  // GET /version - for test URLs (unreachable server simulation)
  http.get('https://unreachable.invalid/index.php/apps/news/api/v1-3/version', () => {
    return HttpResponse.error();
  }),

  // GET /version - for test URLs (wrong path/404 simulation)
  http.get('https://wrong-path.example.com/index.php/apps/news/api/v1-3/version', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  // GET /version - for test URLs (valid alternative server)
  http.get('https://rss.example.com/index.php/apps/news/api/v1-3/version', () => {
    return HttpResponse.json(mockVersion);
  }),

  // GET /feeds - requires auth
  http.get(`${BASE_URL}/feeds`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ feeds: mockFeeds });
  }),

  // POST /feeds - create feed
  http.post(`${BASE_URL}/feeds`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    const body = (await request.json()) as { url: string; folderId: number | null };
    const newFeed = {
      id: Math.floor(Math.random() * 1000) + 100,
      url: body.url,
      title: 'New Feed',
      faviconLink: null,
      added: Math.floor(Date.now() / 1000),
      nextUpdateTime: null,
      folderId: body.folderId,
      ordering: 0,
      link: body.url,
      pinned: false,
      updateErrorCount: 0,
      lastUpdateError: null,
    };
    return HttpResponse.json({ feeds: [newFeed] });
  }),

  // DELETE /feeds/:feedId
  http.delete(`${BASE_URL}/feeds/:feedId`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // PUT /feeds/:feedId/move
  http.put(`${BASE_URL}/feeds/:feedId/move`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // PUT /feeds/:feedId/rename
  http.put(`${BASE_URL}/feeds/:feedId/rename`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /feeds/:feedId/read
  http.post(`${BASE_URL}/feeds/:feedId/read`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // GET /folders - requires auth
  http.get(`${BASE_URL}/folders`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ folders: mockFolders });
  }),

  // POST /folders - create folder
  http.post(`${BASE_URL}/folders`, async ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    const body = (await request.json()) as { name: string };
    const newFolder = {
      id: Math.floor(Math.random() * 1000) + 100,
      name: body.name,
    };
    return HttpResponse.json({ folders: [newFolder] });
  }),

  // PUT /folders/:folderId
  http.put(`${BASE_URL}/folders/:folderId`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // DELETE /folders/:folderId
  http.delete(`${BASE_URL}/folders/:folderId`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /folders/:folderId/read
  http.post(`${BASE_URL}/folders/:folderId/read`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // GET /items - requires auth
  http.get(`${BASE_URL}/items`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }

    const url = new URL(request.url);
    const getRead = url.searchParams.get('getRead') !== 'false';
    const type = parseInt(url.searchParams.get('type') ?? '3', 10);
    const id = parseInt(url.searchParams.get('id') ?? '0', 10);

    let filteredItems = [...mockItems];

    // Filter by read status
    if (!getRead) {
      filteredItems = filteredItems.filter((item) => item.unread);
    }

    // Filter by type
    if (type === 0 && id > 0) {
      // Feed filter
      filteredItems = filteredItems.filter((item) => item.feedId === id);
    } else if (type === 1 && id > 0) {
      // Folder filter - get feeds in folder, then filter items
      const feedsInFolder = mockFeeds.filter((f) => f.folderId === id).map((f) => f.id);
      filteredItems = filteredItems.filter((item) => feedsInFolder.includes(item.feedId));
    } else if (type === 2) {
      // Starred only
      filteredItems = filteredItems.filter((item) => item.starred);
    }

    return HttpResponse.json({ items: filteredItems });
  }),

  // GET /items/updated
  http.get(`${BASE_URL}/items/updated`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }

    const url = new URL(request.url);
    const lastModified = parseInt(url.searchParams.get('lastModified') ?? '0', 10);

    const updatedItems = mockItems.filter((item) => item.lastModified > lastModified);
    return HttpResponse.json({ items: updatedItems });
  }),

  // POST /items/:itemId/read
  http.post(`${BASE_URL}/items/:itemId/read`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/:itemId/unread
  http.post(`${BASE_URL}/items/:itemId/unread`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/:itemId/star
  http.post(`${BASE_URL}/items/:itemId/star`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/:itemId/unstar
  http.post(`${BASE_URL}/items/:itemId/unstar`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/read/multiple
  http.post(`${BASE_URL}/items/read/multiple`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/unread/multiple
  http.post(`${BASE_URL}/items/unread/multiple`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/star/multiple
  http.post(`${BASE_URL}/items/star/multiple`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/unstar/multiple
  http.post(`${BASE_URL}/items/unstar/multiple`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),

  // POST /items/read - mark all read
  http.post(`${BASE_URL}/items/read`, ({ request }) => {
    if (!isAuthorized(request)) {
      return new HttpResponse(null, { status: 401 });
    }
    return new HttpResponse(null, { status: 200 });
  }),
];
