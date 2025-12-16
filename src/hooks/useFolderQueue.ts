'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import { useItems } from './useItems';
import { getFolders } from '@/lib/api/folders';
import { getFeeds } from '@/lib/api/feeds';
import { markItemsRead } from '@/lib/api/items';
import {
  buildFolderQueueFromArticles,
  deriveFolderProgress,
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
import { createEmptyTimelineCache, loadTimelineCache, storeTimelineCache } from '@/lib/storage';

type FeedsSummary = Awaited<ReturnType<typeof getFeeds>>;

interface UseFolderQueueResult {
  queue: FolderQueueEntry[];
  activeFolder: FolderQueueEntry | null;
  activeArticles: ArticlePreview[];
  progress: FolderProgressState;
  totalUnread: number;
  isHydrated: boolean;
  isUpdating: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markFolderRead: (folderId: number) => Promise<void>;
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

function resolveFolderId(article: Article, feedFolderMap: Map<number, number>): number {
  if (typeof article.folderId === 'number' && Number.isFinite(article.folderId)) {
    return article.folderId;
  }

  return feedFolderMap.get(article.feedId) ?? UNCATEGORIZED_FOLDER_ID;
}

function toArticlePreview(article: Article, folderId: number, cachedAt: number): ArticlePreview {
  const trimmedTitle = article.title.trim();
  const fallbackTitle = trimmedTitle.length > 0 ? article.title : 'Untitled article';
  const summary = summarize(article.body, fallbackTitle);
  const trimmedUrl = article.url.trim();
  const hasFullText = article.body.trim().length > 0;

  return {
    id: article.id,
    folderId,
    feedId: article.feedId,
    title: fallbackTitle,
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

function reduceQueueEntries(entries: FolderQueueEntry[]): Record<number, FolderQueueEntry> {
  return entries.reduce<Record<number, FolderQueueEntry>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {});
}

export function useFolderQueue(): UseFolderQueueResult {
  const [envelope, setEnvelope] = useState<TimelineCacheEnvelope>(createEmptyTimelineCache);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const cached = loadTimelineCache();
    // Hydrate client cache from localStorage after mount to avoid SSR mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const {
    items,
    isLoading,
    isValidating,
    error: itemsError,
    refresh,
  } = useItems({
    getRead: false,
    oldestFirst: false,
  });

  useEffect(() => {
    if (!foldersData || isLoading) return;

    // Persist refreshed queue into the cache whenever SWR returns new data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnvelope((current) => {
      const now = Date.now();
      const previews = items.map((article) =>
        toArticlePreview(article, resolveFolderId(article, feedFolderMap), now),
      );

      const queue = buildFolderQueueFromArticles(foldersData, previews, {
        existingEntries: current.folders,
        now,
      });

      const nextFolders = reduceQueueEntries(queue);
      const nextActiveId =
        typeof current.activeFolderId === 'number' && current.activeFolderId in nextFolders
          ? current.activeFolderId
          : (queue[0]?.id ?? null);

      const nextEnvelope: TimelineCacheEnvelope = {
        ...current,
        folders: nextFolders,
        activeFolderId: nextActiveId,
        lastSynced: now,
      };

      storeTimelineCache(nextEnvelope);
      return nextEnvelope;
    });
  }, [foldersData, items, feedFolderMap, isLoading]);

  const sortedQueue = useMemo(() => {
    return sortFolderQueueEntries(Object.values(envelope.folders));
  }, [envelope.folders]);

  const activeFolder = useMemo(() => {
    const activeId = envelope.activeFolderId;
    if (typeof activeId === 'number' && activeId in envelope.folders) {
      return envelope.folders[activeId];
    }

    return sortedQueue.length > 0 ? sortedQueue[0] : null;
  }, [envelope.activeFolderId, envelope.folders, sortedQueue]);

  const progress = useMemo(() => {
    return deriveFolderProgress(sortedQueue, activeFolder ? activeFolder.id : null);
  }, [sortedQueue, activeFolder]);

  const activeArticles = activeFolder ? activeFolder.articles : [];
  const totalUnread = useMemo(() => {
    return sortedQueue.reduce((sum, entry) => sum + entry.unreadCount, 0);
  }, [sortedQueue]);

  const error = itemsError ?? foldersError ?? feedsError ?? null;
  const isUpdating = isValidating || isFoldersLoading || isLoading;

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
        const nextActiveId = remainingQueue.length > 0 ? remainingQueue[0].id : null;

        const nextEnvelope: TimelineCacheEnvelope = {
          ...current,
          folders: updatedFolders,
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
      } catch (error) {
        // On error, keep the pendingReadIds for retry
        console.error('Failed to mark items as read:', error);
        throw error;
      }
    },
    [envelope.folders, refresh],
  );

  return {
    queue: sortedQueue,
    activeFolder,
    activeArticles,
    progress,
    totalUnread,
    isHydrated,
    isUpdating,
    error,
    refresh,
    markFolderRead,
  };
}
