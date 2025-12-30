'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import { useItems } from './useItems';
import { getFolders } from '@/lib/api/folders';
import { getFeeds } from '@/lib/api/feeds';
import { markItemsRead, markItemRead as apiMarkItemRead } from '@/lib/api/items';
import { fetchUnreadItemsForSync, reconcileTimelineCache } from '@/lib/sync';
import {
  deriveFolderProgress,
  moveFolderToEnd,
  pinActiveFolder,
  sortFolderQueueEntries,
} from '@/lib/utils/unreadAggregator';
import {
  type Article,
  type ArticlePreview,
  type Folder,
  type FolderProgressState,
  type FolderQueueEntry,
  type TimelineCacheEnvelope,
  UNCATEGORIZED_FOLDER_ID,
} from '@/types';
import {
  createEmptyTimelineCache,
  loadTimelineCache,
  mergeItemsIntoCache,
  storeTimelineCache,
} from '@/lib/storage';

type FeedsSummary = Awaited<ReturnType<typeof getFeeds>>;

interface UseFolderQueueResult {
  queue: FolderQueueEntry[];
  activeFolder: FolderQueueEntry | null;
  activeArticles: ArticlePreview[];
  progress: FolderProgressState;
  totalUnread: number;
  isHydrated: boolean;
  isUpdating: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setActiveFolder: (folderId: number) => void;
  markFolderRead: (folderId: number) => Promise<void>;
  markItemRead: (itemId: number) => Promise<void>;
  skipFolder: (folderId: number) => Promise<void>;
  restart: () => Promise<void>;
  lastUpdateError: string | null;
}

function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarize(body: string, fallback: string): string {
  const text = stripHtml(body);
  if (!text) return fallback;
  return text.length > 320 ? `${text.slice(0, 317).trim()}…` : text;
}

function resolveFolderId(article: Article, feedFolderMap: Map<number, number>): number | null {
  if (typeof article.folderId === 'number' && Number.isFinite(article.folderId)) {
    return article.folderId;
  }

  if (feedFolderMap.has(article.feedId)) {
    return feedFolderMap.get(article.feedId) ?? UNCATEGORIZED_FOLDER_ID;
  }

  return null;
}

function toArticlePreview(
  article: Article,
  folderId: number | null,
  cachedAt: number,
  feedName: string,
): ArticlePreview | null {
  if (folderId === null) {
    return null;
  }
  const trimmedTitle = article.title.trim();
  const fallbackTitle = trimmedTitle.length > 0 ? article.title : 'Untitled article';
  const summary = summarize(article.body, '');
  const trimmedUrl = article.url.trim();
  const hasFullText = article.body.trim().length > 0;
  const trimmedAuthor = article.author.trim();
  const normalizedFeedName = feedName.trim();

  return {
    id: article.id,
    folderId,
    feedId: article.feedId,
    title: fallbackTitle,
    feedName: normalizedFeedName.length > 0 ? normalizedFeedName : 'Unknown source',
    author: trimmedAuthor,
    summary,
    url: trimmedUrl.length > 0 ? article.url : '#',
    thumbnailUrl: article.mediaThumbnail,
    pubDate: article.pubDate,
    unread: article.unread,
    starred: article.starred,
    hasFullText,
    storedAt: cachedAt,
  };
}

function buildFolderMap(entries: FolderQueueEntry[]): Record<number, FolderQueueEntry> {
  return entries.reduce<Record<number, FolderQueueEntry>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {});
}

function findNextActiveId(queue: FolderQueueEntry[]): number | null {
  const nextActive = queue.find((entry) => entry.status !== 'skipped');
  return nextActive ? nextActive.id : null;
}

const SYNC_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Sync timed out'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function applyFolderNames(
  envelope: TimelineCacheEnvelope,
  foldersData: Folder[] | undefined,
): TimelineCacheEnvelope {
  if (!foldersData || foldersData.length === 0) {
    return envelope;
  }

  const folderNameMap = new Map<number, string>(
    foldersData.map((folder) => [folder.id, folder.name]),
  );
  const updatedFolders: Record<number, FolderQueueEntry> = {};

  for (const [folderIdStr, folder] of Object.entries(envelope.folders)) {
    const id = Number(folderIdStr);
    const resolvedName =
      folderNameMap.get(id) ?? (id === UNCATEGORIZED_FOLDER_ID ? 'Uncategorized' : folder.name);
    updatedFolders[id] = {
      ...folder,
      name: resolvedName,
    };
  }

  return {
    ...envelope,
    folders: updatedFolders,
  };
}

function applyFeedNames(
  envelope: TimelineCacheEnvelope,
  feedNameMap: Map<number, string>,
): TimelineCacheEnvelope {
  if (feedNameMap.size === 0) {
    return envelope;
  }

  const updatedFolders: Record<number, FolderQueueEntry> = {};

  for (const [folderIdStr, folder] of Object.entries(envelope.folders)) {
    const updatedArticles = folder.articles.map((article) => {
      const resolvedName = feedNameMap.get(article.feedId) ?? article.feedName;
      return resolvedName !== article.feedName ? { ...article, feedName: resolvedName } : article;
    });

    updatedFolders[Number(folderIdStr)] = {
      ...folder,
      articles: updatedArticles,
    };
  }

  return {
    ...envelope,
    folders: updatedFolders,
  };
}

export function useFolderQueue(): UseFolderQueueResult {
  const [envelope, setEnvelope] = useState<TimelineCacheEnvelope>(createEmptyTimelineCache);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastUpdateError, setLastUpdateError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const cached = loadTimelineCache();
    // Hydrate client cache from localStorage after mount to avoid SSR mismatches.

    setEnvelope(cached);
    setIsHydrated(true);
  }, []);

  const {
    data: foldersData,
    error: foldersError,
    isLoading: isFoldersLoading,
  } = useSWRImmutable<Folder[], Error>('folders', getFolders);

  const { data: feedsResponse, error: feedsError } = useSWRImmutable<FeedsSummary, Error>(
    'feeds',
    getFeeds,
  );
  const feeds = useMemo(() => feedsResponse?.feeds ?? [], [feedsResponse]);

  const feedFolderMap = useMemo(() => {
    return new Map<number, number>(
      feeds.map((feed) => [feed.id, feed.folderId ?? UNCATEGORIZED_FOLDER_ID]),
    );
  }, [feeds]);
  const feedNameMap = useMemo(() => {
    return new Map<number, string>(feeds.map((feed) => [feed.id, feed.title]));
  }, [feeds]);

  const {
    allItems,
    isLoading,
    isValidating,
    error: itemsError,
    refresh: swrRefresh,
  } = useItems({
    getRead: false,
    oldestFirst: false,
  });

  const hasLocalUnread = useMemo(() => {
    return Object.values(envelope.folders).some((entry) => entry.unreadCount > 0);
  }, [envelope.folders]);
  const hasLocalArticles = useMemo(() => {
    const hasArticles = Object.values(envelope.folders).some((entry) => entry.articles.length > 0);
    return hasArticles || envelope.pendingReadIds.length > 0;
  }, [envelope.folders, envelope.pendingReadIds.length]);

  // Refresh with error handling (retry logic handled at page level)
  const refresh = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      if (!hasLocalUnread && !hasLocalArticles) {
        await swrRefresh();
        setLastUpdateError(null);
        return;
      }

      const { items, serverUnreadIds } = await withTimeout(
        fetchUnreadItemsForSync(),
        SYNC_TIMEOUT_MS,
      );
      const now = Date.now();

      setEnvelope((current) => {
        const { envelope: reconciled } = reconcileTimelineCache(current, serverUnreadIds, now);
        const previews = items
          .map((article) =>
            toArticlePreview(
              article,
              resolveFolderId(article, feedFolderMap),
              now,
              feedNameMap.get(article.feedId) ?? 'Unknown source',
            ),
          )
          .filter((preview): preview is ArticlePreview => preview !== null);

        const merged = mergeItemsIntoCache(reconciled, previews, now);
        const nextEnvelope = applyFeedNames(applyFolderNames(merged, foldersData), feedNameMap);

        storeTimelineCache(nextEnvelope);
        return nextEnvelope;
      });

      setLastUpdateError(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      setLastUpdateError(errorMessage);

      if (process.env.NODE_ENV === 'development') {
        console.debug('❌ Timeline update failed:', errorMessage);
      }

      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [feedFolderMap, feedNameMap, foldersData, hasLocalArticles, hasLocalUnread, swrRefresh]);

  useEffect(() => {
    if (!foldersData || isLoading) return;

    // Persist refreshed queue into the cache whenever SWR returns new data.

    setEnvelope((current) => {
      const now = Date.now();
      const previews = allItems
        .map((article) =>
          toArticlePreview(
            article,
            resolveFolderId(article, feedFolderMap),
            now,
            feedNameMap.get(article.feedId) ?? 'Unknown source',
          ),
        )
        .filter((preview): preview is ArticlePreview => preview !== null);

      // Use mergeItemsIntoCache to handle deduplication and pendingReadIds
      const merged = mergeItemsIntoCache(current, previews, now);
      const nextEnvelope = applyFeedNames(applyFolderNames(merged, foldersData), feedNameMap);

      storeTimelineCache(nextEnvelope);
      return nextEnvelope;
    });
  }, [foldersData, allItems, feedFolderMap, feedNameMap, isLoading]);

  useEffect(() => {
    if (!isHydrated || feedNameMap.size === 0) return;

    setEnvelope((current) => {
      const nextEnvelope = applyFeedNames(current, feedNameMap);
      if (nextEnvelope === current) {
        return current;
      }
      storeTimelineCache(nextEnvelope);
      return nextEnvelope;
    });
  }, [feedNameMap, isHydrated]);

  const sortedQueue = useMemo(() => {
    return sortFolderQueueEntries(Object.values(envelope.folders));
  }, [envelope.folders]);

  const activeFolder = useMemo(() => {
    const activeId = envelope.activeFolderId;
    if (typeof activeId === 'number' && activeId in envelope.folders) {
      return envelope.folders[activeId];
    }

    return sortedQueue.find((f) => f.status !== 'skipped') ?? null;
  }, [envelope.activeFolderId, envelope.folders, sortedQueue]);

  const orderedQueue = useMemo(() => {
    return pinActiveFolder(sortedQueue, activeFolder ? activeFolder.id : null);
  }, [sortedQueue, activeFolder]);

  const progress = useMemo(() => {
    return deriveFolderProgress(orderedQueue, activeFolder ? activeFolder.id : null);
  }, [orderedQueue, activeFolder]);

  const activeArticles = activeFolder ? activeFolder.articles : [];
  const totalUnread = useMemo(() => {
    return sortedQueue.reduce((sum, entry) => sum + entry.unreadCount, 0);
  }, [sortedQueue]);

  const error = itemsError ?? foldersError ?? feedsError ?? null;
  const isUpdating = isSyncing || isValidating || isFoldersLoading || isLoading;

  const setActiveFolder = useCallback((folderId: number) => {
    setEnvelope((current) => {
      if (!(folderId in current.folders)) {
        return current;
      }

      const target = current.folders[folderId];
      const updatedFolders = { ...current.folders };
      if (target.status === 'skipped') {
        updatedFolders[folderId] = {
          ...target,
          status: 'queued',
        };
      }

      const nextEnvelope: TimelineCacheEnvelope = {
        ...current,
        folders: updatedFolders,
        activeFolderId: folderId,
      };

      storeTimelineCache(nextEnvelope);
      return nextEnvelope;
    });
  }, []);

  const markFolderRead = useCallback(
    async (folderId: number) => {
      const folder = envelope.folders[folderId];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!folder) {
        return;
      }

      const itemIds = folder.articles.map((article) => article.id);

      // Optimistically update the cache
      setEnvelope((current) => {
        const updatedFolders = { ...current.folders };
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete updatedFolders[folderId];

        const remainingQueue = sortFolderQueueEntries(Object.values(updatedFolders));
        const nextActiveId = findNextActiveId(remainingQueue);

        const nextEnvelope: TimelineCacheEnvelope = {
          ...current,
          folders: buildFolderMap(remainingQueue),
          activeFolderId: nextActiveId,
          pendingReadIds: [...current.pendingReadIds, ...itemIds],
        };

        storeTimelineCache(nextEnvelope);
        return nextEnvelope;
      });

      // Call the API to mark items as read
      try {
        await markItemsRead(itemIds);

        // Remove from pendingReadIds on success
        setEnvelope((current) => {
          const nextEnvelope: TimelineCacheEnvelope = {
            ...current,
            pendingReadIds: current.pendingReadIds.filter((id) => !itemIds.includes(id)),
          };
          storeTimelineCache(nextEnvelope);
          return nextEnvelope;
        });

        // Trigger a refresh to get updated data from the server
        await refresh();
      } catch (error: unknown) {
        // On error, keep the pendingReadIds for retry
        console.error('Failed to mark items as read:', error);
        throw error;
      }
    },
    [envelope.folders, refresh],
  );

  const skipFolder = useCallback((folderId: number) => {
    return new Promise<void>((resolve) => {
      setEnvelope((current) => {
        const updatedEntries = moveFolderToEnd(Object.values(current.folders), folderId);
        const remainingQueue = sortFolderQueueEntries(updatedEntries);
        const nextActiveId = findNextActiveId(remainingQueue);

        const nextEnvelope: TimelineCacheEnvelope = {
          ...current,
          folders: buildFolderMap(remainingQueue),
          activeFolderId: nextActiveId,
          pendingSkipFolderIds: [...current.pendingSkipFolderIds, folderId],
        };

        storeTimelineCache(nextEnvelope);
        return nextEnvelope;
      });
      resolve();
    });
  }, []);

  const restart = useCallback(() => {
    return new Promise<void>((resolve) => {
      setEnvelope((current) => {
        const updatedFolders = { ...current.folders };

        Object.values(updatedFolders).forEach((folder) => {
          if (folder.status === 'skipped') {
            updatedFolders[folder.id] = {
              ...folder,
              status: 'queued',
            };
          }
        });

        const remainingQueue = sortFolderQueueEntries(Object.values(updatedFolders));
        const nextActiveId = findNextActiveId(remainingQueue);

        const nextEnvelope: TimelineCacheEnvelope = {
          ...current,
          folders: buildFolderMap(remainingQueue),
          activeFolderId: nextActiveId,
          pendingSkipFolderIds: [],
        };

        storeTimelineCache(nextEnvelope);
        return nextEnvelope;
      });
      resolve();
    });
  }, []);

  const markItemRead = useCallback(async (itemId: number) => {
    // Optimistically update cache
    setEnvelope((current) => {
      const updatedFolders = { ...current.folders };

      // Find which folder has this item
      let targetFolderId: number | null = null;
      for (const folderIdStr in updatedFolders) {
        const fid = Number(folderIdStr);
        const folder = updatedFolders[fid];
        if (folder.articles.some((a) => a.id === itemId)) {
          targetFolderId = fid;
          break;
        }
      }

      if (targetFolderId === null) return current;

      const folder = updatedFolders[targetFolderId];
      const updatedArticles = folder.articles.map((article) =>
        article.id === itemId ? { ...article, unread: false } : article,
      );

      const unreadCount = updatedArticles.filter((a) => a.unread).length;

      updatedFolders[targetFolderId] = {
        ...folder,
        articles: updatedArticles,
        unreadCount,
      };

      const remainingQueue = sortFolderQueueEntries(Object.values(updatedFolders));
      const nextActiveId =
        current.activeFolderId === targetFolderId && targetFolderId in updatedFolders
          ? targetFolderId
          : findNextActiveId(remainingQueue);

      const nextEnvelope: TimelineCacheEnvelope = {
        ...current,
        folders: buildFolderMap(remainingQueue),
        activeFolderId: nextActiveId,
        pendingReadIds: [...current.pendingReadIds, itemId],
      };

      storeTimelineCache(nextEnvelope);
      return nextEnvelope;
    });

    try {
      await apiMarkItemRead(itemId);

      // Remove from pendingReadIds on success
      setEnvelope((current) => {
        const nextEnvelope: TimelineCacheEnvelope = {
          ...current,
          pendingReadIds: current.pendingReadIds.filter((id) => id !== itemId),
        };
        storeTimelineCache(nextEnvelope);
        return nextEnvelope;
      });
    } catch (error) {
      console.error('Failed to mark item as read:', error);
      // Keep in pendingReadIds for retry
    }
  }, []);

  return {
    queue: orderedQueue,
    activeFolder,
    activeArticles,
    progress,
    totalUnread,
    isHydrated,
    isUpdating,
    isRefreshing: isSyncing,
    error,
    refresh,
    setActiveFolder,
    markFolderRead,
    markItemRead,
    skipFolder,
    restart,
    lastUpdateError,
  };
}
