# Data Model: Static Headless RSS Web App

**Feature**: 001-static-rss-app  
**Date**: 2025-12-10  
**Purpose**: Define TypeScript interfaces, validation rules, and state transitions for key entities.

---

## Entity Overview

```
┌─────────────────┐     ┌─────────────────┐
│ UserSessionConfig│     │     Folder      │
│   (client-only) │     │    (API sync)   │
└────────┬────────┘     └────────┬────────┘
         │                       │ 1:N
         │                       ▼
         │              ┌─────────────────┐
         │              │      Feed       │
         │              │    (API sync)   │
         │              └────────┬────────┘
         │                       │ 1:N
         │                       ▼
         │              ┌─────────────────┐
         └──────────────│     Article     │
                        │    (API sync)   │
                        └────────┬────────┘
                                 │ N:1
                                 ▼
                        ┌─────────────────┐
                        │ ReadStateMutation│
                        │  (client queue) │
                        └─────────────────┘
```

---

## 1. UserSessionConfig

**Purpose**: Client-only session state capturing API connection and user preferences.

```typescript
interface UserSessionConfig {
  /** Base URL of the headless-rss server (e.g., https://rss.example.com) */
  baseUrl: string;
  
  /** Username for HTTP Basic auth */
  username: string;
  
  /** Base64-encoded credentials: base64(username:password) */
  credentials: string;
  
  /** Whether credentials are persisted to localStorage (true) or sessionStorage (false) */
  rememberDevice: boolean;
  
  /** User preference: default timeline view mode */
  viewMode: 'card' | 'compact' | 'list';
  
  /** User preference: sort order */
  sortOrder: 'newest' | 'oldest';
  
  /** User preference: show read items in timeline */
  showRead: boolean;
  
  /** ISO 8601 timestamp of last successful sync */
  lastSyncAt: string | null;
}
```

**Validation Rules**:
| Field | Rule | Error Message |
|-------|------|---------------|
| `baseUrl` | Must be valid HTTPS URL | "Server URL must use HTTPS" |
| `baseUrl` | Must not end with trailing slash | Normalize automatically |
| `username` | Non-empty string | "Username is required" |
| `credentials` | Valid base64 string | Internal error (derived) |
| `viewMode` | One of allowed values | Default to 'card' |
| `sortOrder` | One of allowed values | Default to 'newest' |

**State Transitions**:
```
[Anonymous] --login--> [Authenticated] --logout--> [Anonymous]
                             │
                             └──session-expired--> [Anonymous]
```

**Storage**:
- `sessionStorage` (default): Key `newsboxzero:session`
- `localStorage` (opt-in): Key `newsboxzero:session`
- Preferences only: `localStorage` key `newsboxzero:preferences`

---

## 2. Folder

**Purpose**: Organizational container for feeds; mirrors Nextcloud News folder entity.

```typescript
interface Folder {
  /** Unique folder ID from API */
  id: number;
  
  /** Display name */
  name: string;
  
  /** Computed: total unread count across contained feeds */
  unreadCount: number;
  
  /** Computed: array of feed IDs in this folder */
  feedIds: number[];
}
```

**API Source**: `GET /index.php/apps/news/api/v1-3/folders`

**Validation Rules**:
| Field | Rule | Error Message |
|-------|------|---------------|
| `id` | Positive integer | Internal error |
| `name` | Non-empty, max 128 chars | "Folder name is required" / "Folder name too long" |

**State Transitions**:
```
[Created] --rename--> [Updated] --delete--> [Deleted]
```

**Notes**:
- `unreadCount` is computed client-side by summing `feed.unreadCount` for feeds where `feed.folderId === folder.id`
- Root-level feeds have `folderId: null` (virtual "Uncategorized" folder)

---

## 3. Feed

**Purpose**: RSS/Atom feed subscription; contains articles and belongs to a folder.

```typescript
interface Feed {
  /** Unique feed ID from API */
  id: number;
  
  /** Feed title (may be user-renamed) */
  title: string;
  
  /** Original feed URL */
  url: string;
  
  /** URL to feed's website (not the feed itself) */
  link: string;
  
  /** Favicon URL or null */
  faviconLink: string | null;
  
  /** ISO 8601 timestamp of last successful fetch by server */
  added: number;
  
  /** Parent folder ID, null for root-level feeds */
  folderId: number | null;
  
  /** Number of unread articles (computed client-side from `/items` responses; may be seeded from API if present) */
  unreadCount: number;
  
  /** Sort order within folder (lower = higher) */
  ordering: number;
  
  /** Whether feed is pinned to top of sidebar */
  pinned: boolean;
  
  /** Feed fetch error message, null if healthy */
  lastUpdateError: string | null;
  
  /** Update mode: 0 = ignore, 1 = normal */
  updateMode: 0 | 1;
}
```

**API Source**: `GET /index.php/apps/news/api/v1-3/feeds`

**Validation Rules**:
| Field | Rule | Error Message |
|-------|------|---------------|
| `id` | Positive integer | Internal error |
| `title` | Non-empty, max 512 chars | "Feed title is required" |
| `url` | Valid URL | "Invalid feed URL" |
| `folderId` | Positive integer or null | Internal error |
| `unreadCount` | Non-negative integer | Default to 0 |

**State Transitions**:
```
[Pending] --create--> [Active] --move--> [Active]
                          │
                          └──rename--> [Active]
                          │
                          └──delete--> [Deleted]
```

---

## 4. Article

**Purpose**: Individual news item from a feed; primary content displayed in timeline.

```typescript
interface Article {
  /** Unique item ID from API */
  id: number;
  
  /** GUID from feed (used for starring) */
  guid: string;
  
  /** Hash of GUID (used in star/unstar API calls) */
  guidHash: string;
  
  /** Article headline */
  title: string;
  
  /** Article author name, may be empty */
  author: string;
  
  /** URL to original article */
  url: string;
  
  /** HTML content body */
  body: string;
  
  /** Parent feed ID */
  feedId: number;
  
  /** Whether article has been read */
  unread: boolean;
  
  /** Whether article is starred */
  starred: boolean;
  
  /** Unix timestamp (seconds) of publication */
  pubDate: number;
  
  /** Unix timestamp (seconds) of last modification */
  lastModified: number;
  
  /** Enclosure URL (podcast/video), null if none */
  enclosureLink: string | null;
  
  /** Enclosure MIME type */
  enclosureMime: string | null;
  
  /** Fingerprint for deduplication */
  fingerprint: string;
  
  /** Content hash for change detection */
  contentHash: string;
  
  /** Rich media preview metadata (optional) */
  mediaThumbnail: string | null;
  mediaDescription: string | null;
}
```

**API Source**: `GET /index.php/apps/news/api/v1-3/items`

**Validation Rules**:
| Field | Rule | Error Message |
|-------|------|---------------|
| `id` | Positive integer | Internal error |
| `feedId` | Positive integer | Internal error |
| `title` | Max 1024 chars | Truncate if exceeded |
| `body` | Sanitized HTML | Strip dangerous tags |
| `url` | Valid URL or empty | Allow empty |
| `pubDate` | Valid Unix timestamp | Default to 0 |

**State Transitions**:
```
[Unread] --mark-read--> [Read] --mark-unread--> [Unread]
   │                      │
   └──star--> [Starred]   └──star--> [Starred]
                │                      │
                └──unstar--> [base state]
```

---

## 5. ReadStateMutation

**Purpose**: Client-side queue for optimistic updates; tracks pending API mutations.

```typescript
interface ReadStateMutation {
  /** Unique mutation ID (UUID) */
  id: string;
  
  /** Type of mutation */
  type: 'markRead' | 'markUnread' | 'star' | 'unstar' | 'markFeedRead' | 'markFolderRead';
  
  /** Target item/feed/folder ID(s) */
  targetIds: number[];
  
  /** For star/unstar: guidHash values */
  guidHashes?: string[];
  
  /** ISO 8601 timestamp when mutation was queued */
  createdAt: string;
  
  /** Current status */
  status: 'pending' | 'in-flight' | 'success' | 'failed';
  
  /** Error message if failed */
  error?: string;
  
  /** Retry count */
  retryCount: number;
  
  /** Maximum retries before giving up */
  maxRetries: number;
  
  /** Previous state for rollback */
  rollbackData: {
    itemStates: Map<number, { unread: boolean; starred: boolean }>;
  };
}
```

**Validation Rules**:
| Field | Rule | Error Message |
|-------|------|---------------|
| `id` | Valid UUID v4 | Internal error |
| `targetIds` | Non-empty array | "No items selected" |
| `type` | One of allowed values | Internal error |
| `retryCount` | 0 ≤ n ≤ maxRetries | Stop retrying |

**State Transitions**:
```
[Pending] --dispatch--> [In-Flight] --success--> [Success] --cleanup--> [Removed]
                             │
                             └──failure--> [Failed] --retry--> [Pending]
                                              │
                                              └──max-retries--> [Rollback] --cleanup--> [Removed]
```

**Queue Behavior**:
- Mutations are processed FIFO
- Failed mutations trigger UI rollback using `rollbackData`
- Successful mutations are removed from queue after 5s (for debugging visibility)
- Queue persists in memory only (not localStorage)

---

## Type Exports

All types are exported from `src/types/`:

```typescript
// src/types/index.ts
export type { UserSessionConfig } from './session';
export type { Folder } from './folder';
export type { Feed } from './feed';
export type { Article } from './article';
export type { ReadStateMutation } from './mutation';
```

---

## API Response Wrappers

```typescript
// Response wrapper for list endpoints
interface ApiListResponse<T> {
  [key: string]: T[];
}

// Example: GET /folders returns { folders: Folder[] }
// Example: GET /feeds returns { feeds: Feed[], starredCount: number, newestItemId: number }
// Example: GET /items returns { items: Article[] }
```

---

## Computed / Derived State

| Derived Value | Source | Computation |
|--------------|--------|-------------|
| `folder.unreadCount` | `feeds[]` | `feeds.filter(f => f.folderId === folder.id).reduce((sum, f) => sum + f.unreadCount, 0)` |
| `totalUnread` | `feeds[]` | `feeds.reduce((sum, f) => sum + f.unreadCount, 0)` |
| `starredCount` | API response | Returned directly from `/feeds` |
| `isOnline` | `navigator.onLine` | Event listener |
| `hasPendingMutations` | `mutations[]` | `mutations.some(m => m.status !== 'success')` |
