# Data Model: Article Sync Read Status

## Entities

| Entity | Description | Fields | Validation / Notes |
| --- | --- | --- | --- |
| `Article` | Canonical article representation from the API. | `id`, `feedId`, `folderId?`, `title`, `body`, `url`, `lastModified`, `unread`, `starred` | Only `unread=true` items are retained in client state. |
| `ArticlePreview` | Cached unread article used in the timeline queue. | `id`, `folderId`, `feedId`, `title`, `summary`, `url`, `unread`, `starred`, `storedAt` | Must remain unread; evict immediately when read is detected. |
| `TimelineCacheEnvelope` | Persisted unread queue state in localStorage. | `version`, `lastSynced`, `activeFolderId`, `folders`, `pendingReadIds`, `pendingSkipFolderIds` | `folders` contain only unread `ArticlePreview` entries. `pendingReadIds` represent optimistic local read actions. |
| `ReconciliationSweep` | Ephemeral result of a sync pass. | `serverUnreadIds`, `removedIds`, `checkedAt` | Not persisted; used to update cache during refresh. |

## Relationships

- `TimelineCacheEnvelope.folders[*].articles[]` are `ArticlePreview` entries derived from `Article` API responses.
- `ReconciliationSweep.serverUnreadIds` is built from the unread-only `/items` responses and compared against `ArticlePreview.id` values.

## Validation Rules

1. `ArticlePreview.unread` must always be `true` while cached.
2. `FolderQueueEntry.unreadCount` equals `articles.filter(a => a.unread).length`.
3. Any `ArticlePreview.id` missing from `serverUnreadIds` after a successful reconciliation is evicted.
4. `TimelineCacheEnvelope.folders` must not contain entries with `unreadCount === 0` after reconciliation.

## State Transitions

```text
[Unread Cached] --reconcile:missing on server--> [Evicted]
[Unread Cached] --mark read (local)--> [Evicted + pendingReadIds]
[Evicted] --next sync (server unread again)--> [Unread Cached]
```

## Derived Fields

- `totalUnread`: sum of all `FolderQueueEntry.unreadCount`.
- `activeFolderId`: `null` when the queue is empty; otherwise must exist in `folders`.
