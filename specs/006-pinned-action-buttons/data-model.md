# Data Model: Pinned Action Buttons

## Entities

### ArticlePreview
Represents unread-only items rendered in the timeline list.
- Fields: `id`, `folderId`, `feedId`, `title`, `summary`, `url`, `thumbnailUrl`, `pubDate`, `unread`, `starred`, `hasFullText`, `storedAt?`
- Notes: Unread-only focus means read items are removed from the cache immediately after being marked read.

### FolderQueueEntry
Represents a folder entry in the timeline queue.
- Fields: `id`, `name`, `sortOrder`, `status`, `unreadCount`, `articles: ArticlePreview[]`, `lastUpdated`
- Relationships: Owns `articles` and contributes to derived timeline status (queued/active/skipped/completed).

### TimelineCacheEnvelope
Persistent cache envelope stored in localStorage for the timeline view.
- Fields: `version`, `lastSynced`, `activeFolderId`, `folders: Record<number, FolderQueueEntry>`, `pendingReadIds`, `pendingSkipFolderIds`
- Notes: `pendingReadIds` and `pendingSkipFolderIds` drive optimistic UI states and retry behavior.

### Timeline Status (Derived)
Computed state used by controls to determine enable/disable behavior.
- Inputs: `folders`, `activeFolderId`, `pendingReadIds`, `pendingSkipFolderIds`, `FolderProgressState.allViewed`
- Output: `allViewed` / `hasUnread` booleans used to disable Skip and Mark All Read while keeping Sync enabled.

## State Transitions

- **Mark All Read**: Marks the active folder’s unread articles as read, appends to `pendingReadIds`, and removes or updates folder entries. Once server confirms, `pendingReadIds` are cleared and unread items are evicted.
- **Skip Folder**: Moves the active folder to a skipped status, updates `pendingSkipFolderIds`, and advances `activeFolderId`.
- **Sync**: Fetches unread-only items and reconciles the cache without introducing read articles.
