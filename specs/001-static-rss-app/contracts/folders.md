# Folders API Contract

**Base Path**: `/index.php/apps/news/api/v1-3/folders`

---

## GET /folders

Fetch all folders.

### Request

```http
GET /index.php/apps/news/api/v1-3/folders HTTP/1.1
Authorization: Basic base64(username:password)
```

### Response

```typescript
interface FolderGetOut {
  folders: Folder[];
}

interface Folder {
  id: number;
  name: string;
}
```

### Example Response

```json
{
  "folders": [
    { "id": 1, "name": "Tech News" },
    { "id": 2, "name": "Blogs" },
    { "id": 3, "name": "Podcasts" }
  ]
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Invalid credentials |

### Note on Unread Counts

The folders endpoint does **not** return unread counts. To compute folder unread counts:

1. Fetch all feeds via `GET /feeds`
2. Group feeds by `folderId`
3. Sum `unreadCount` for each group (if feed objects had unreadCount)

Since the v1.3 API doesn't include `unreadCount` on Feed objects, you must compute from items:

```typescript
// Count unread items per folder
async function getFolderUnreadCounts(): Promise<Map<number, number>> {
  const { items } = await fetchItems({ getRead: false, type: 3 });
  const { feeds } = await fetchFeeds();
  
  const feedToFolder = new Map(feeds.map(f => [f.id, f.folderId]));
  const counts = new Map<number, number>();
  
  for (const item of items) {
    if (item.unread) {
      const folderId = feedToFolder.get(item.feedId) ?? null;
      const key = folderId ?? -1; // -1 for uncategorized
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  
  return counts;
}
```

---

## POST /folders

Create a new folder.

### Request

```http
POST /index.php/apps/news/api/v1-3/folders HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface FolderPostIn {
  name: string;  // Folder name
}
```

### Example Request

```json
{
  "name": "New Folder"
}
```

### Response

```typescript
interface FolderPostOut {
  folders: Folder[];  // Array with single newly created folder
}
```

### Example Response

```json
{
  "folders": [
    { "id": 4, "name": "New Folder" }
  ]
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Folder created |
| 401 | Invalid credentials |
| 409 | Folder with this name already exists |
| 422 | Validation error (empty name) |

---

## PUT /folders/{folder_id}

Rename an existing folder.

### Request

```http
PUT /index.php/apps/news/api/v1-3/folders/{folder_id} HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| folder_id | path | integer | Yes | Folder ID to rename |

```typescript
interface FolderPutIn {
  name: string;  // New folder name
}
```

### Example Request

```json
{
  "name": "Renamed Folder"
}
```

### Response

Empty object on success.

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Folder renamed |
| 401 | Invalid credentials |
| 404 | Folder not found |
| 409 | Folder with this name already exists |
| 422 | Validation error |

---

## DELETE /folders/{folder_id}

Delete a folder.

### Request

```http
DELETE /index.php/apps/news/api/v1-3/folders/{folder_id} HTTP/1.1
Authorization: Basic base64(username:password)
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| folder_id | path | integer | Yes | Folder ID to delete |

### Response

Empty object on success.

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Folder deleted |
| 401 | Invalid credentials |
| 404 | Folder not found |
| 422 | Validation error |

### Behavior Note

When a folder is deleted, feeds within that folder are moved to root level (`folderId: null`), not deleted. The UI should:

1. Confirm deletion with user
2. Optionally show which feeds will be affected
3. After deletion, refresh feeds list to show updated `folderId` values

---

## POST /folders/{folder_id}/read

Mark all items in a folder as read up to a specific item ID.

### Request

```http
POST /index.php/apps/news/api/v1-3/folders/{folder_id}/read HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| folder_id | path | integer | Yes | Folder ID |

```typescript
interface MarkItemsReadIn {
  newestItemId: number;  // Mark all items with ID <= this as read
}
```

### Example Request

```json
{
  "newestItemId": 12345
}
```

### Response

Empty object on success.

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Items marked as read |
| 401 | Invalid credentials |
| 404 | Folder not found |
| 422 | Validation error |

### Use Case

"Mark folder as read" action. Fetch items for the folder, get the highest item ID, then call this endpoint.

```typescript
async function markFolderAsRead(folderId: number): Promise<void> {
  // Get newest item ID in folder
  const { items } = await fetchItems({ type: 1, id: folderId, batchSize: 1 });
  if (items.length === 0) return;
  
  const newestItemId = Math.max(...items.map(i => i.id));
  
  await fetch(`${baseUrl}/folders/${folderId}/read`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ newestItemId })
  });
}
```

---

## Sidebar Navigation Pattern

Build navigation tree combining folders and feeds:

```typescript
interface NavNode {
  type: 'folder' | 'feed' | 'special';
  id: number | string;
  label: string;
  unreadCount: number;
  children?: NavNode[];
  icon?: string;
}

async function buildNavTree(): Promise<NavNode[]> {
  const [{ folders }, { feeds }] = await Promise.all([
    fetchFolders(),
    fetchFeeds()
  ]);
  
  const tree: NavNode[] = [
    { type: 'special', id: 'all', label: 'All Articles', unreadCount: 0 },
    { type: 'special', id: 'starred', label: 'Starred', unreadCount: 0 },
  ];
  
  // Group feeds by folder
  const feedsByFolder = new Map<number | null, Feed[]>();
  for (const feed of feeds) {
    const key = feed.folderId;
    if (!feedsByFolder.has(key)) feedsByFolder.set(key, []);
    feedsByFolder.get(key)!.push(feed);
  }
  
  // Add folders with nested feeds
  for (const folder of folders) {
    const folderFeeds = feedsByFolder.get(folder.id) ?? [];
    tree.push({
      type: 'folder',
      id: folder.id,
      label: folder.name,
      unreadCount: 0, // Computed elsewhere
      children: folderFeeds.map(f => ({
        type: 'feed',
        id: f.id,
        label: f.title ?? f.url,
        unreadCount: 0,
        icon: f.faviconLink ?? undefined
      }))
    });
  }
  
  // Add root-level feeds
  const rootFeeds = feedsByFolder.get(null) ?? [];
  for (const feed of rootFeeds) {
    tree.push({
      type: 'feed',
      id: feed.id,
      label: feed.title ?? feed.url,
      unreadCount: 0,
      icon: feed.faviconLink ?? undefined
    });
  }
  
  return tree;
}
```
