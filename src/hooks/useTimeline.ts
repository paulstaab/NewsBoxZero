'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import useSWRImmutable from 'swr/immutable';
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
  type SelectionActions,
} from '@/types';
import {
  createEmptyTimelineCache,
  loadTimelineCache,
  mergeItemsIntoCache,
  storeTimelineCache,
} from '@/lib/storage';
import {
  getNextSelectionId,
  getPreviousSelectionId,
  getTopmostVisibleId,
} from '@/lib/timeline/selection';
import { createReadBatcher } from '@/lib/timeline/read-batching';

type FeedsSummary = Awaited<ReturnType<typeof getFeeds>>;

export interface UseTimelineOptions {
  root?: Element | null;
  topOffset?: number;
  debounceMs?: number;
}

export interface UseTimelineResult extends SelectionActions {
  queue: FolderQueueEntry[];
  activeFolder: FolderQueueEntry | null;
  activeArticles: ArticlePreview[];
  progress: FolderProgressState;
  totalUnread: number;
  isHydrated: boolean;
  isUpdating: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: (options?: RefreshOptions) => Promise<void>;
  setActiveFolder: (folderId: number) => void;
  markFolderRead: (folderId: number) => Promise<void>;
  markItemRead: (itemId: number) => Promise<void>;
  skipFolder: (folderId: number) => Promise<void>;
  restart: () => Promise<void>;
  lastUpdateError: string | null;
  selectedArticleId: number | null;
  setSelectedArticleId: (id: number | null) => void;
  selectedArticleElement: HTMLElement | null;
  setSelectedArticleElement: (element: HTMLElement | null) => void;
  registerArticle: (id: number) => (node: HTMLElement | null) => void;
}

interface RefreshOptions {
  forceSync?: boolean;
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
const MIN_SYNC_INDICATOR_MS = 350;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export function useTimeline(options: UseTimelineOptions = {}): UseTimelineResult {
  const { root, topOffset = 0, debounceMs = 100 } = options;
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

  // Refresh with error handling (retry logic handled at page level)
  const refresh = useCallback(
    async (_options?: RefreshOptions): Promise<void> => {
      void _options;
      const startedAt = Date.now();
      setIsSyncing(true);
      try {
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
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_SYNC_INDICATOR_MS) {
          await delay(MIN_SYNC_INDICATOR_MS - elapsed);
        }
        setIsSyncing(false);
      }
    },
    [feedFolderMap, feedNameMap, foldersData],
  );

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

  useEffect(() => {
    if (!isHydrated || !foldersData || foldersData.length === 0) return;

    const folderNameMap = new Map<number, string>(
      foldersData.map((folder) => [folder.id, folder.name]),
    );

    setEnvelope((current) => {
      let hasUpdates = false;
      const updatedFolders: Record<number, FolderQueueEntry> = {};

      for (const [folderIdStr, folder] of Object.entries(current.folders)) {
        const id = Number(folderIdStr);
        const resolvedName =
          folderNameMap.get(id) ?? (id === UNCATEGORIZED_FOLDER_ID ? 'Uncategorized' : folder.name);
        if (folder.name !== resolvedName) {
          hasUpdates = true;
        }
        updatedFolders[id] =
          folder.name === resolvedName
            ? folder
            : {
                ...folder,
                name: resolvedName,
              };
      }

      if (!hasUpdates) {
        return current;
      }

      const nextEnvelope: TimelineCacheEnvelope = {
        ...current,
        folders: updatedFolders,
      };
      storeTimelineCache(nextEnvelope);
      return nextEnvelope;
    });
  }, [foldersData, isHydrated, envelope.folders]);

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

  const activeArticles = useMemo(() => {
    return activeFolder ? activeFolder.articles : [];
  }, [activeFolder]);
  const totalUnread = useMemo(() => {
    return sortedQueue.reduce((sum, entry) => sum + entry.unreadCount, 0);
  }, [sortedQueue]);

  const error = foldersError ?? feedsError ?? null;
  const isUpdating = isSyncing || isFoldersLoading;

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
      if (!(folderId in envelope.folders)) {
        return;
      }

      const folder = envelope.folders[folderId];

      const itemIds = folder.articles.map((article) => article.id);

      setEnvelope((current) => {
        const { [folderId]: _removed, ...updatedFolders } = current.folders;
        void _removed;

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

      try {
        await markItemsRead(itemIds);

        setEnvelope((current) => {
          const nextEnvelope: TimelineCacheEnvelope = {
            ...current,
            pendingReadIds: current.pendingReadIds.filter((id) => !itemIds.includes(id)),
          };
          storeTimelineCache(nextEnvelope);
          return nextEnvelope;
        });
        await refresh();
      } catch (error: unknown) {
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
    setEnvelope((current) => {
      const updatedFolders = { ...current.folders };

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
    }
  }, []);

  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [selectedArticleElement, setSelectedArticleElement] = useState<HTMLElement | null>(null);

  const orderedIds = useMemo(() => activeArticles.map((article) => article.id), [activeArticles]);

  const selectTopmost = useCallback(
    (topmostId?: number | null) => {
      const resolvedId = topmostId ?? getTopmostVisibleId(orderedIds);
      if (resolvedId === null || typeof resolvedId === 'undefined') return;
      setSelectedArticleId(resolvedId);
    },
    [orderedIds],
  );

  const selectNext = useCallback(() => {
    const nextId = getNextSelectionId(selectedArticleId, orderedIds);
    if (nextId === null) return;
    setSelectedArticleId(nextId);
  }, [orderedIds, selectedArticleId]);

  const selectPrevious = useCallback(() => {
    const prevId = getPreviousSelectionId(selectedArticleId, orderedIds);
    if (prevId === null) return;
    setSelectedArticleId(prevId);
  }, [orderedIds, selectedArticleId]);

  const deselect = useCallback(() => {
    setSelectedArticleId(null);
    setSelectedArticleElement(null);
  }, []);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const seenRef = useRef<Set<number>>(new Set());
  const batcherRef = useRef<ReturnType<typeof createReadBatcher> | null>(null);
  const unreadMapRef = useRef<Map<number, boolean>>(new Map());

  useEffect(() => {
    batcherRef.current?.clear();
    batcherRef.current = createReadBatcher({
      debounceMs: debounceMs,
      onFlush: (ids) => {
        ids.forEach((id) => {
          void markItemRead(id);
        });
      },
    });

    return () => {
      batcherRef.current?.clear();
      batcherRef.current = null;
    };
  }, [debounceMs, markItemRead]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          const id = Number(target.dataset.articleId);
          if (!Number.isFinite(id)) return;

          if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
            if (seenRef.current.has(id)) return;
            if (unreadMapRef.current.get(id) === false) return;
            seenRef.current.add(id);
            batcherRef.current?.add(id);
          }
        });
      },
      {
        root: root ?? null,
        rootMargin: `${String(-Math.max(0, Math.round(topOffset)))}px 0px 0px 0px`,
        threshold: [0],
      },
    );

    observerRef.current = observer;
    elementsRef.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [root, topOffset]);

  useEffect(() => {
    unreadMapRef.current = new Map(activeArticles.map((item) => [item.id, item.unread]));
    const currentIds = new Set(activeArticles.map((item) => item.id));
    for (const [id, element] of elementsRef.current.entries()) {
      if (!currentIds.has(id)) {
        observerRef.current?.unobserve(element);
        elementsRef.current.delete(id);
        seenRef.current.delete(id);
      }
    }
  }, [activeArticles]);

  const registerArticle = useCallback(
    (id: number) => (node: HTMLElement | null) => {
      if (!node) return;
      node.dataset.articleId = String(id);
      elementsRef.current.set(id, node);
      observerRef.current?.observe(node);
    },
    [],
  );

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
    selectedArticleId,
    setSelectedArticleId,
    selectedArticleElement,
    setSelectedArticleElement,
    selectTopmost,
    selectNext,
    selectPrevious,
    deselect,
    registerArticle,
  };
}
