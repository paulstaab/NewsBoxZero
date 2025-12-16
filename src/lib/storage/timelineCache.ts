import { CONFIG } from '@/lib/config/env';
import type { ArticlePreview, FolderQueueEntry, TimelineCacheEnvelope } from '@/types';
import { pruneArticlePreviews, sortFolderQueueEntries } from '@/lib/utils/unreadAggregator';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = CONFIG.TIMELINE_MAX_ITEM_AGE_DAYS * DAY_IN_MS;

function ensureArrayOfNumbers(value: number[] | undefined): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id) => Number.isFinite(id))));
}

function ensureArticlesArray(value: ArticlePreview[] | undefined): ArticlePreview[] {
  if (!Array.isArray(value)) return [];
  return value;
}

function rebuildFolderMap(entries: FolderQueueEntry[]): Record<number, FolderQueueEntry> {
  return entries.reduce<Record<number, FolderQueueEntry>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {});
}

/**
 * Returns the default timeline cache envelope.
 */
export function createEmptyTimelineCache(): TimelineCacheEnvelope {
  return {
    version: CONFIG.TIMELINE_CACHE_VERSION,
    lastSynced: 0,
    activeFolderId: null,
    folders: {},
    pendingReadIds: [],
    pendingSkipFolderIds: [],
  };
}

function normalizeEnvelope(
  envelope: Partial<TimelineCacheEnvelope> | null | undefined,
): TimelineCacheEnvelope {
  if (!envelope || envelope.version !== CONFIG.TIMELINE_CACHE_VERSION) {
    return createEmptyTimelineCache();
  }

  return {
    version: CONFIG.TIMELINE_CACHE_VERSION,
    lastSynced: envelope.lastSynced ?? 0,
    activeFolderId: envelope.activeFolderId ?? null,
    folders: envelope.folders ?? {},
    pendingReadIds: ensureArrayOfNumbers(envelope.pendingReadIds),
    pendingSkipFolderIds: ensureArrayOfNumbers(envelope.pendingSkipFolderIds),
  };
}

/**
 * Loads the cached timeline envelope from localStorage.
 * Falls back to an empty envelope if storage is unavailable or corrupted.
 */
export function loadTimelineCache(): TimelineCacheEnvelope {
  if (typeof window === 'undefined') {
    return createEmptyTimelineCache();
  }

  const raw = localStorage.getItem(CONFIG.TIMELINE_CACHE_KEY);
  if (!raw) {
    return createEmptyTimelineCache();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TimelineCacheEnvelope>;
    const normalized = normalizeEnvelope(parsed);
    return pruneTimelineCache(normalized);
  } catch {
    localStorage.removeItem(CONFIG.TIMELINE_CACHE_KEY);
    return createEmptyTimelineCache();
  }
}

/**
 * Persists the timeline cache envelope to localStorage (after pruning).
 */
export function storeTimelineCache(envelope: TimelineCacheEnvelope): void {
  if (typeof window === 'undefined') return;
  const pruned = pruneTimelineCache(envelope);
  localStorage.setItem(CONFIG.TIMELINE_CACHE_KEY, JSON.stringify(pruned));
}

function pruneFolders(
  folders: Record<number, FolderQueueEntry>,
  now = Date.now(),
): Record<number, FolderQueueEntry> {
  const validEntries = Object.values(folders).map((entry) => ({
    ...entry,
    articles: ensureArticlesArray(entry.articles),
  }));

  const prunedEntries = validEntries
    .map((entry) => {
      const articles = pruneArticlePreviews(entry.articles, { now });
      const unreadCount = articles.filter((article) => article.unread).length;
      return unreadCount === 0
        ? null
        : {
            ...entry,
            articles,
            unreadCount,
          };
    })
    .filter((entry): entry is FolderQueueEntry => entry !== null);

  const sortedEntries = sortFolderQueueEntries(prunedEntries);
  return rebuildFolderMap(sortedEntries);
}

function deriveActiveFolderId(
  currentActiveId: number | null,
  folders: Record<number, FolderQueueEntry>,
): number | null {
  if (typeof currentActiveId === 'number' && currentActiveId in folders) {
    return currentActiveId;
  }

  const ordered = Object.values(folders).sort((a, b) => a.sortOrder - b.sortOrder);
  if (ordered.length === 0) {
    return null;
  }
  return ordered[0].id;
}

function prunePendingSkips(
  pendingSkipFolderIds: number[],
  folders: Record<number, FolderQueueEntry>,
): number[] {
  const validIds = new Set(Object.keys(folders).map((id) => Number(id)));
  return pendingSkipFolderIds.filter((id) => validIds.has(id));
}

/**
 * Applies retention caps (max age + max items) and removes empty folders.
 */
export function pruneTimelineCache(
  envelope: TimelineCacheEnvelope,
  now = Date.now(),
): TimelineCacheEnvelope {
  const normalized = normalizeEnvelope(envelope);
  const folders = pruneFolders(normalized.folders, now);
  const pendingReadIds = ensureArrayOfNumbers(normalized.pendingReadIds);
  const pendingSkipFolderIds = prunePendingSkips(
    ensureArrayOfNumbers(normalized.pendingSkipFolderIds),
    folders,
  );

  // Drop cache if it has grown beyond retention window to avoid stale payloads
  const lastSyncedWithinWindow = normalized.lastSynced > now - MAX_AGE_MS * 2;

  return {
    version: CONFIG.TIMELINE_CACHE_VERSION,
    lastSynced: lastSyncedWithinWindow ? normalized.lastSynced : 0,
    activeFolderId: deriveActiveFolderId(normalized.activeFolderId, folders),
    folders,
    pendingReadIds,
    pendingSkipFolderIds,
  };
}
