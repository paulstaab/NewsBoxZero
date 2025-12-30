import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Article, Folder, Feed, ArticlePreview, FolderQueueEntry } from '@/types';
import { useFolderQueue } from '@/hooks/useFolderQueue';
import { CONFIG } from '@/lib/config/env';
import { createEmptyTimelineCache } from '@/lib/storage';
import { getItems } from '@/lib/api/items';

// Mock SWR immutable hook to return deterministic folder/feed payloads
const mocks = vi.hoisted(() => ({
  foldersData: { value: [] as Folder[] | undefined },
  feedsData: { value: [] as Feed[] },
  useItemsResult: {
    items: [] as Article[],
    allItems: [] as Article[],
    isLoading: false,
    isValidating: false,
    error: null,
    refresh: vi.fn(),
  },
}));

vi.mock('swr/immutable', () => {
  return {
    default: (key: string) => {
      if (key === 'folders') {
        return { data: mocks.foldersData.value, error: null, isLoading: false };
      }
      if (key === 'feeds') {
        return { data: { feeds: mocks.feedsData.value }, error: null, isLoading: false };
      }
      return { data: undefined, error: null, isLoading: false };
    },
  };
});

vi.mock('@/hooks/useItems', () => ({
  useItems: () => mocks.useItemsResult,
}));

vi.mock('@/lib/api/folders', () => ({
  getFolders: vi.fn(),
}));

vi.mock('@/lib/api/feeds', () => ({
  getFeeds: vi.fn(),
}));

vi.mock('@/lib/api/items', () => ({
  getItems: vi.fn().mockResolvedValue([]),
  markItemsRead: vi.fn().mockResolvedValue(undefined),
  markItemRead: vi.fn().mockResolvedValue(undefined),
}));

function buildArticle(partial: Partial<Article>): Article {
  return {
    id: partial.id ?? Math.floor(Math.random() * 10_000),
    guid: partial.guid ?? `guid-${Math.random().toString(36).slice(2)}`,
    guidHash: partial.guidHash ?? 'hash',
    title: partial.title ?? 'Test Article',
    author: partial.author ?? 'NewsBoxZero',
    url: partial.url ?? 'https://example.com/article',
    body: partial.body ?? '<p>Body</p>',
    feedId: partial.feedId ?? 1,
    folderId: partial.folderId ?? null,
    unread: partial.unread ?? true,
    starred: partial.starred ?? false,
    pubDate: partial.pubDate ?? 1_700_000_000,
    lastModified: partial.lastModified ?? 1_700_000_000,
    enclosureLink: partial.enclosureLink ?? null,
    enclosureMime: partial.enclosureMime ?? null,
    fingerprint: partial.fingerprint ?? 'fp',
    contentHash: partial.contentHash ?? 'hash',
    mediaThumbnail: partial.mediaThumbnail ?? null,
    mediaDescription: partial.mediaDescription ?? null,
    rtl: partial.rtl ?? false,
  };
}

function buildFeed(partial: Partial<Feed>): Feed {
  return {
    id: partial.id ?? 1,
    title: partial.title ?? 'Sample Feed',
    url: partial.url ?? 'https://example.com/feed.xml',
    link: partial.link ?? 'https://example.com',
    faviconLink: partial.faviconLink ?? null,
    added: partial.added ?? 0,
    folderId: partial.folderId ?? null,
    unreadCount: partial.unreadCount ?? 0,
    ordering: partial.ordering ?? 0,
    pinned: partial.pinned ?? false,
    lastUpdateError: partial.lastUpdateError ?? null,
    updateMode: partial.updateMode ?? 1,
  };
}

function setItems(items: Article[]) {
  mocks.useItemsResult.items = items;
  mocks.useItemsResult.allItems = items;
}

describe('useFolderQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    setItems([]);
    mocks.useItemsResult.isLoading = false;
    mocks.useItemsResult.isValidating = false;
    mocks.useItemsResult.error = null;
    mocks.foldersData.value = [];
    mocks.feedsData.value = [];
  });

  it('prioritizes folders by unread count and exposes active articles', async () => {
    mocks.foldersData.value = [
      { id: 10, name: 'Dev Updates', unreadCount: 0, feedIds: [] },
      { id: 20, name: 'Design Notes', unreadCount: 0, feedIds: [] },
    ];
    mocks.feedsData.value = [
      buildFeed({ id: 1, title: 'Dev Feed', folderId: 10 }),
      buildFeed({ id: 2, title: 'Design Feed', folderId: 20 }),
    ];

    setItems([
      buildArticle({ id: 1, feedId: 1, folderId: 10, title: 'Dev A' }),
      buildArticle({ id: 2, feedId: 1, folderId: 10, title: 'Dev B' }),
      buildArticle({ id: 3, feedId: 2, folderId: 20, title: 'Design A' }),
    ]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.queue.length).toBe(2);
      expect(result.current.activeFolder?.id).toBe(10);
    });

    expect(result.current.activeArticles).toHaveLength(2);
    expect(result.current.totalUnread).toBe(3);
    expect(result.current.progress.currentFolderId).toBe(10);
    expect(result.current.progress.nextFolderId).toBe(20);
  });

  it('hydrates from cached envelope when network data is unavailable', async () => {
    const cachedEnvelope = createEmptyTimelineCache();
    const cachedArticles: ArticlePreview[] = [
      {
        id: 99,
        folderId: 42,
        feedId: 9,
        title: 'Offline Story',
        feedName: 'Offline Feed',
        author: 'Offline Author',
        summary: 'Cached summary',
        url: 'https://example.com/offline',
        thumbnailUrl: null,
        pubDate: 1_700_000_100,
        unread: true,
        starred: false,
        hasFullText: false,
        storedAt: Date.now(),
      },
    ];

    const cachedEntry: FolderQueueEntry = {
      id: 42,
      name: 'Offline Folder',
      sortOrder: 0,
      status: 'queued',
      unreadCount: 1,
      articles: cachedArticles,
      lastUpdated: Date.now(),
    };

    cachedEnvelope.folders[cachedEntry.id] = cachedEntry;
    cachedEnvelope.activeFolderId = 42;

    localStorage.setItem(CONFIG.TIMELINE_CACHE_KEY, JSON.stringify(cachedEnvelope));

    mocks.foldersData.value = undefined;
    setItems([]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(42);
    });

    expect(result.current.activeArticles).toHaveLength(1);
    expect(result.current.activeArticles[0].title).toBe('Offline Story');
    expect(result.current.totalUnread).toBe(1);
    expect(result.current.queue[0]?.name).toBe('Offline Folder');
  });

  it('marks a folder as read, removes articles, and advances to next folder', async () => {
    mocks.foldersData.value = [
      { id: 10, name: 'Dev Updates', unreadCount: 0, feedIds: [] },
      { id: 20, name: 'Design Notes', unreadCount: 0, feedIds: [] },
    ];
    mocks.feedsData.value = [
      buildFeed({ id: 1, folderId: 10 }),
      buildFeed({ id: 2, folderId: 20 }),
    ];

    setItems([
      buildArticle({ id: 1, feedId: 1, folderId: 10, title: 'Dev A' }),
      buildArticle({ id: 2, feedId: 1, folderId: 10, title: 'Dev B' }),
      buildArticle({ id: 3, feedId: 2, folderId: 20, title: 'Design A' }),
    ]);
    vi.mocked(getItems).mockResolvedValue([
      buildArticle({ id: 3, feedId: 2, folderId: 20, title: 'Design A' }),
    ]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(10);
      expect(result.current.activeArticles).toHaveLength(2);
    });

    // Mark first folder as read
    await act(async () => {
      await result.current.markFolderRead(10);
    });

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(20);
      expect(result.current.activeArticles).toHaveLength(1);
    });

    expect(result.current.totalUnread).toBe(1);
    expect(result.current.queue).toHaveLength(1);
  });

  it('tracks pendingReadIds when marking folder as read', async () => {
    mocks.foldersData.value = [{ id: 10, name: 'Dev Updates', unreadCount: 0, feedIds: [] }];
    mocks.feedsData.value = [buildFeed({ id: 1, folderId: 10 })];

    setItems([
      buildArticle({ id: 1, feedId: 1, folderId: 10 }),
      buildArticle({ id: 2, feedId: 1, folderId: 10 }),
    ]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(10);
    });

    // Mark folder as read (this is async)
    let markPromise: Promise<void> = Promise.resolve();
    act(() => {
      markPromise = result.current.markFolderRead(10);
    });

    // Check that items were removed optimistically from queue before the API call completes
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(0);
    });

    // Wait for the API call to complete
    await markPromise;

    // After successful API call, pendingReadIds should be cleared (removed on success)
    const cache = JSON.parse(localStorage.getItem(CONFIG.TIMELINE_CACHE_KEY) ?? '{}') as {
      pendingReadIds?: number[];
    };
    expect(cache.pendingReadIds).toEqual([]);
  });

  it('skips a folder, moving it to the end of the queue', async () => {
    mocks.foldersData.value = [
      { id: 10, name: 'Dev Updates', unreadCount: 0, feedIds: [] },
      { id: 20, name: 'Design Notes', unreadCount: 0, feedIds: [] },
    ];
    mocks.feedsData.value = [
      buildFeed({ id: 1, folderId: 10 }),
      buildFeed({ id: 2, folderId: 20 }),
    ];

    setItems([
      buildArticle({ id: 1, feedId: 1, folderId: 10, title: 'Dev A' }),
      buildArticle({ id: 3, feedId: 2, folderId: 20, title: 'Design A' }),
    ]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(10);
    });

    // Skip first folder
    await act(async () => {
      await result.current.skipFolder(10);
    });

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(20);
    });

    // Check that folder 10 is now at the end of the queue
    expect(result.current.queue).toHaveLength(2);
    expect(result.current.queue[0].id).toBe(20);
    expect(result.current.queue[1].id).toBe(10);
    expect(result.current.queue[1].status).toBe('skipped');
  });

  it('pins a selected folder to the front while preserving remaining order', async () => {
    mocks.foldersData.value = [
      { id: 10, name: 'Dev Updates', unreadCount: 0, feedIds: [] },
      { id: 20, name: 'Design Notes', unreadCount: 0, feedIds: [] },
      { id: 30, name: 'Growth', unreadCount: 0, feedIds: [] },
    ];
    mocks.feedsData.value = [
      buildFeed({ id: 1, folderId: 10 }),
      buildFeed({ id: 2, folderId: 20 }),
      buildFeed({ id: 3, folderId: 30 }),
    ];

    setItems([
      buildArticle({ id: 1, feedId: 1, folderId: 10 }),
      buildArticle({ id: 2, feedId: 1, folderId: 10 }),
      buildArticle({ id: 3, feedId: 2, folderId: 20 }),
      buildArticle({ id: 4, feedId: 2, folderId: 20 }),
      buildArticle({ id: 5, feedId: 3, folderId: 30 }),
    ]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.queue[0]?.id).toBe(10);
    });

    act(() => {
      result.current.setActiveFolder(30);
    });

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(30);
    });

    expect(result.current.queue.map((entry) => entry.id)).toEqual([30, 10, 20]);
  });

  it('keeps read items in cache until the next sync reconciliation', async () => {
    mocks.foldersData.value = [{ id: 10, name: 'Dev Updates', unreadCount: 0, feedIds: [] }];
    mocks.feedsData.value = [buildFeed({ id: 1, folderId: 10 })];

    setItems([
      buildArticle({ id: 1, feedId: 1, folderId: 10, title: 'Dev A' }),
      buildArticle({ id: 2, feedId: 1, folderId: 10, title: 'Dev B' }),
    ]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.activeArticles).toHaveLength(2);
    });

    await act(async () => {
      await result.current.markItemRead(1);
    });

    await waitFor(() => {
      expect(result.current.activeArticles).toHaveLength(2);
      expect(result.current.activeArticles[0].unread).toBe(false);
    });

    await act(async () => {
      await result.current.markItemRead(2);
    });

    await waitFor(() => {
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.activeFolder?.id).toBe(10);
      expect(result.current.activeArticles.every((article) => !article.unread)).toBe(true);
    });
  });

  it('restarts the queue when all folders are skipped', async () => {
    mocks.foldersData.value = [{ id: 10, name: 'Dev Updates', unreadCount: 0, feedIds: [] }];
    mocks.feedsData.value = [buildFeed({ id: 1, folderId: 10 })];
    setItems([buildArticle({ id: 1, feedId: 1, folderId: 10 })]);

    const { result } = renderHook(() => useFolderQueue());

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(10);
    });

    // Skip the only folder
    await act(async () => {
      await result.current.skipFolder(10);
    });

    await waitFor(() => {
      expect(result.current.activeFolder).toBeNull();
      expect(result.current.queue[0].status).toBe('skipped');
    });

    // Restart
    await act(async () => {
      await result.current.restart();
    });

    await waitFor(() => {
      expect(result.current.activeFolder?.id).toBe(10);
      expect(result.current.queue[0].status).toBe('queued');
    });
  });
});
