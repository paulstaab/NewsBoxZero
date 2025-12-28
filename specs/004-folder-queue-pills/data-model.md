# Data Model: Folder Queue Pills

**Feature**: 004-folder-queue-pills  
**Updated**: 2025-12-28

## 1. Entity Atlas

| Entity | Purpose | Key Fields | Validation / Notes |
|--------|---------|------------|--------------------|
| `TimelineCacheEnvelope` | Persisted unread queue state stored in `feedfront.timeline.v1`. | `version`, `lastSynced`, `activeFolderId`, `folders`, `pendingReadIds`, `pendingSkipFolderIds`. | `activeFolderId` must reference a folder in `folders` or be `null`. `pendingReadIds` are tombstones for unread-only enforcement. |
| `FolderQueueEntry` | Represents a folder in the queue and its unread articles. | `id`, `name`, `sortOrder`, `status`, `unreadCount`, `articles`, `lastUpdated`. | `unreadCount` must equal unread articles in `articles`. `status` is `queued | active | skipped | completed`. |
| `FolderQueuePill` | UI representation of a queued folder in the pill strip. | `id`, `label`, `unreadCount`, `isActive`, `isSkipped`. | `label` format: `${name} (${unreadCount})`. Only unread folders render pills. |
| `FolderProgressState` | Derived state for navigation between folders. | `currentFolderId`, `nextFolderId`, `remainingFolderIds`, `allViewed`. | Derived from queue order; recomputed after every cache mutation. |
| `ArticlePreview` | Cached unread article used by the timeline. | `id`, `folderId`, `feedId`, `title`, `summary`, `url`, `unread`, `starred`, `storedAt`. | Items are removed from cache when marked read. |

## 2. Relationships

- `FolderQueueEntry.articles[*].folderId` must equal `FolderQueueEntry.id`.
- `FolderQueuePill.id` maps directly to `FolderQueueEntry.id`.
- `TimelineCacheEnvelope.activeFolderId` drives the selected pill and timeline list.

## 3. State Transitions

### Folder Queue

```text
queued -> active -> completed (removed from queue)
     \-> skipped -> queued (on restart only)
```

- **queued -> active**: Happens when the selected folder is first in the queue.
- **active -> completed**: Triggered by "Mark All as Read"; the folder is removed from the queue if unread count reaches zero.
- **active -> skipped**: Triggered by "Skip"; folder stays in queue but is moved to the end.
- **skipped -> queued**: Triggered by restart/reset action; skip status cleared.

### Active Selection

- If the active folder becomes empty, selection shifts to the next queued folder.
- If no folders remain, `activeFolderId` becomes `null` and the timeline shows an empty state.

## 4. Ordering Rules

1. **Selected Folder First**: The active folder is always rendered as pill index 0 while it has unread items.
2. **Unread Count Sorting**: Remaining folders sort by unread count descending; ties preserve the prior queue order (`sortOrder`).
3. **Skip to End**: When skipped, the folder receives the largest `sortOrder` and renders after all non-skipped entries until the next reload.
4. **Reload Rebuild**: On reload, the queue is rebuilt from unread counts and stable tie order, ignoring previous skip positioning.

## 5. Validation Rules

- `FolderQueueEntry.unreadCount` equals `articles.filter(a => a.unread).length`.
- The queue never includes folders with `unreadCount === 0`.
- `FolderQueuePill.label` must always include the unread count in parentheses.
- Timeline list contents must match `activeFolderId` only.

## 6. Data Access Patterns

- `useFolderQueue()` owns the queue state and writes to `timelineCache` on every mutation.
- The pill strip renders from `queue` plus `activeFolder` in `useFolderQueue()`.
- `useItems()` continues to fetch unread items; `mergeItemsIntoCache()` rehydrates the queue on refresh.
