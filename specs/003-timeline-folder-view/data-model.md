# Data Model: Folder-Based Timeline View

**Feature**: 003-timeline-folder-view  
**Updated**: 2025-12-16

## 1. Entity Atlas

| Entity | Purpose | Key Fields | Validation / Notes |
|--------|---------|------------|--------------------|
| `TimelineCacheEnvelope` | Single object persisted under `newsboxzero.timeline.v1` that stores all unread state. | `version` (number), `lastSynced` (epoch seconds), `activeFolderId` (number \| null), `folders` (`Record<folderId, FolderQueueEntry>`), `pendingReadIds` (number[]), `pendingSkipFolderIds` (number[]). | `version` increments on breaking changes; `pendingReadIds` is cleared after successful sync. Envelope payload must stay <2 MB (enforced by pruning and per-folder caps). |
| `FolderQueueEntry` | Represents a folder in the reading queue. | `id`, `name`, `sortOrder` (number), `status` (`"queued" | "active" | "skipped" | "completed"`), `unreadCount`, `articles` (`ArticlePreview[]`), `lastUpdated` (epoch seconds). | `unreadCount` = count of `articles` with `state === 'unread'`; `status` transitions described below; `articles.length` capped at 200, older entries pruned by `pubDate`. |
| `ArticlePreview` | Minimal representation of a headless-rss article kept client-side. | `id`, `folderId`, `feedId`, `title`, `summary`, `thumbnailUrl`, `pubDate`, `unread` (bool), `starred` (bool), `hasFullText` (bool, indicates `body` exists), `storedAt` (epoch seconds). | `title` falls back to `"Untitled"` if missing. `pubDate` stored as epoch seconds; if missing from API use fetch timestamp. `thumbnailUrl` optional. `storedAt` used for retention pruning (>=14 days → drop). |
| `FolderProgressState` | Runtime helper describing which folder is currently showing. | `currentFolderId`, `nextFolderId`, `remainingFolderIds` (ordered array), `allViewed` (bool). | Derived from `TimelineCacheEnvelope`. `allViewed` becomes true when every `FolderQueueEntry.status` is either `completed` or `skipped`. |
| `MarkActionPayload` | Batch payload submitted to `/items/read/multiple`. | `itemIds` (number[]), `folderId`, `source` (`"mark-all" | "expand"`). | `itemIds` deduped before request. `source` used only for metrics/telemetry. |

## 2. Relationships

- `FolderQueueEntry.articles[*].folderId` must equal the entry's `id`.
- `ArticlePreview.feedId` maps to existing `Feed` entities already defined in `src/types/feed.ts`; no new attributes are required, but we reuse them to derive feed titles/tooltips.
- `TimelineCacheEnvelope.folders` references folder metadata provided by `GET /folders` (id, name, feed ids). The cache only stores the subset needed for the queue; full metadata stays in SWR caches.

## 3. State Transitions

### Folder Lifecycle

```text
queued → active → completed
            ↘
             skipped → viewed (implicit once user restarts and folder returns to queue)
```

- **queued → active**: Happens when the folder becomes first in the sorted array. Sets `activeFolderId` and surfaces its articles.
- **active → completed**: Triggered by "Mark All as Read" after `markItemsRead` succeeds. Remove folder from unread queue, append to end with `status = completed` (for restart ordering) and empty `articles` array.
- **active → skipped**: Triggered by "Skip". Move folder ID to the end of queue with `status = skipped`. Articles remain marked unread in the cache.
- **skipped → active**: Occurs automatically when the queue cycles back (after restart). No API calls are made; `status` reverts to `active` and articles remain untouched.

### Article Lifecycle

```text
unread → reading → read
   ↘
    skipped (implicit: belongs to skipped folder but item state stays unread)
```

- **unread → reading**: Occurs when the card expands. The UI immediately toggles `unread=false`, enqueues item ID into `pendingReadIds`, and optimistically updates the cache.
- **reading → read**: After `POST /items/{id}/read` resolves, remove the ID from `pendingReadIds`. If it fails, revert `unread=true` and show an error toast.
- **read → unread**: Only possible when the user explicitly reopens the folder after restart; we do not store read items, so this path is effectively pruned.

## 4. Derived Structures & Validation Rules

1. **Folder Sorting**
   - Sort key: `(-unreadCount, folderName.toLowerCase(), folderId)`.
   - Update after every cache mutation or API refresh.
   - Persisted `sortOrder` ensures deterministic order on reload until counts change.

2. **Retention / Pruning**
   - When inserting articles, drop any older than 14 days _or_ if `articles.length > 200` drop the oldest by `pubDate`.
   - If a folder would have zero unread items after pruning, remove the folder entry entirely.

3. **All-Folders-Viewed State**
   - Computed when every folder's `status` is `completed` or `skipped` and there are no unread articles left. The restart CTA resets `status` for skipped folders back to `queued` and rehydrates `activeFolderId` with the first entry.

4. **Update Merge Requirements**
   - Input: fresh `Article[]` from `/items` plus existing `TimelineCacheEnvelope`.
   - Steps: (a) drop duplicates already stored, (b) insert new articles by folder, (c) update `unreadCount`, (d) recompute `sortOrder`.
   - Ensure `pendingReadIds` act as tombstones so removed articles do not return if the API still reports them unread.

5. **Validation Examples**
   - `FolderQueueEntry.unreadCount` must equal `articles.filter(a => a.unread).length`. Enforce via `assertFolderCounts()` helper in tests.
   - `TimelineCacheEnvelope.folders` must never be empty while `activeFolderId` is set; if empty, clear `activeFolderId` and surface the "all read" UX.

## 5. Data Access Patterns

- `useFolderQueue()` reads the entire `TimelineCacheEnvelope` once on mount, stores it in React state, and writes back (debounced) whenever actions modify the queue.
- `useItems()` continues to fetch raw articles from `/items`. Successful fetches call `mergeItemsIntoCache(newItems)` to update the envelope.
- `storage.ts` exposes `loadTimelineCache()` and `storeTimelineCache()` helpers, both guarding against JSON parse errors and falling back to an empty envelope with `version = 1`.

These models ensure the folder-based timeline can satisfy persistence, ordering, and mark-read semantics entirely on the client without new backend constructs.
