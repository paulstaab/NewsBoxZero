# Items API Contract

**Base Path**: `/index.php/apps/news/api/v1-3/items`

---

## GET /items

Fetch items (articles) with filtering and pagination.

### Request

```http
GET /index.php/apps/news/api/v1-3/items?batchSize=50&offset=0&type=3&getRead=false HTTP/1.1
Authorization: Basic base64(username:password)
```

### Query Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| batchSize | integer | -1 | Number of items to fetch (-1 = all) |
| offset | integer | 0 | Pagination offset |
| type | integer | 1 | Filter type: 0=FEED, 1=FOLDER, 2=STARRED, 3=ALL |
| id | integer | 0 | Feed or folder ID (when type=0 or type=1) |
| getRead | boolean | true | Include read items |
| oldestFirst | boolean | false | Sort oldest first |
| lastModified | integer | 0 | Unix timestamp filter |

### Response

```typescript
interface ItemGetOut {
  items: Article[];
}

interface Article {
  id: number;
  title: string | null;
  content: string | null;       // HTML content (may be same as body)
  author: string | null;
  body: string | null;          // HTML body
  contentHash: string | null;   // For change detection
  enclosureLink: string | null; // Media attachment URL
  enclosureMime: string | null; // MIME type of enclosure
  feedId: number;
  fingerprint: string | null;   // Deduplication hash
  guid: string;                 // Feed item GUID
  guidHash: string;             // Hash of GUID (used for star operations)
  lastModified: number;         // Unix timestamp
  mediaDescription: string | null;
  mediaThumbnail: string | null;
  pubDate: number | null;       // Unix timestamp
  rtl: boolean;                 // Right-to-left text
  starred: boolean;
  unread: boolean;
  updatedDate: number | null;   // Unix timestamp
  url: string | null;           // Link to original article
}
```

### Example Request (Unread items from all feeds)

```http
GET /index.php/apps/news/api/v1-3/items?batchSize=50&type=3&getRead=false HTTP/1.1
```

### Example Request (Items from specific folder)

```http
GET /index.php/apps/news/api/v1-3/items?batchSize=50&type=1&id=5&getRead=true HTTP/1.1
```

### Example Request (Starred items only)

```http
GET /index.php/apps/news/api/v1-3/items?type=2 HTTP/1.1
```

### Example Response

```json
{
  "items": [
    {
      "id": 12345,
      "title": "Breaking: New RSS Reader Released",
      "content": "<p>A new static RSS reader...</p>",
      "author": "Jane Doe",
      "body": "<p>A new static RSS reader...</p>",
      "contentHash": "abc123def456",
      "enclosureLink": null,
      "enclosureMime": null,
      "feedId": 1,
      "fingerprint": "fp789xyz",
      "guid": "https://example.com/posts/12345",
      "guidHash": "a1b2c3d4e5",
      "lastModified": 1702200000,
      "mediaDescription": null,
      "mediaThumbnail": null,
      "pubDate": 1702199000,
      "rtl": false,
      "starred": false,
      "unread": true,
      "updatedDate": null,
      "url": "https://example.com/posts/12345"
    }
  ]
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Invalid credentials |
| 422 | Validation error |

---

## GET /items/updated

Fetch items modified since a specific timestamp.

### Request

```http
GET /index.php/apps/news/api/v1-3/items/updated?lastModified=1702200000&type=3&id=0 HTTP/1.1
Authorization: Basic base64(username:password)
```

### Query Parameters (Required)

| Name | Type | Description |
|------|------|-------------|
| lastModified | integer | Unix timestamp - get items modified after this |
| type | integer | Filter type: 0=FEED, 1=FOLDER, 2=STARRED, 3=ALL |
| id | integer | Feed or folder ID |

### Response

Same as `GET /items`.

### Use Case

Poll for updates without re-fetching entire timeline. Store `lastModified` from previous batch and request updates since then.

---

## POST /items/{item_id}/read

Mark a single item as read.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/{item_id}/read HTTP/1.1
Authorization: Basic base64(username:password)
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| item_id | path | integer | Yes | Item ID to mark read |

### Response

Empty object on success.

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Item marked as read |
| 401 | Invalid credentials |
| 404 | Item not found |
| 422 | Validation error |

---

## POST /items/{item_id}/unread

Mark a single item as unread.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/{item_id}/unread HTTP/1.1
Authorization: Basic base64(username:password)
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| item_id | path | integer | Yes | Item ID to mark unread |

### Response

Empty object on success.

---

## POST /items/{item_id}/star

Star a single item.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/{item_id}/star HTTP/1.1
Authorization: Basic base64(username:password)
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| item_id | path | integer | Yes | Item ID to star |

### Response

Empty object on success.

---

## POST /items/{item_id}/unstar

Unstar a single item.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/{item_id}/unstar HTTP/1.1
Authorization: Basic base64(username:password)
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| item_id | path | integer | Yes | Item ID to unstar |

### Response

Empty object on success.

---

## POST /items/read/multiple

Mark multiple items as read.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/read/multiple HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface ItemIDListIn {
  itemIds: number[];  // Array of item IDs
}
```

### Example Request

```json
{
  "itemIds": [12345, 12346, 12347]
}
```

### Response

Empty object on success.

---

## POST /items/unread/multiple

Mark multiple items as unread.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/unread/multiple HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface ItemIDListIn {
  itemIds: number[];
}
```

---

## POST /items/star/multiple

Star multiple items.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/star/multiple HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface ItemIDListIn {
  itemIds: number[];
}
```

---

## POST /items/unstar/multiple

Unstar multiple items.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/unstar/multiple HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface ItemIDListIn {
  itemIds: number[];
}
```

---

## POST /items/read

Mark all items as read up to a specific item ID.

### Request

```http
POST /index.php/apps/news/api/v1-3/items/read HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface MarkAllItemsReadIn {
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

### Use Case

"Mark all as read" action in the UI. Pass the ID of the newest visible item to mark everything up to that point.

---

## Pagination Strategy

The Nextcloud News API uses offset-based pagination:

```typescript
// Initial request
GET /items?batchSize=50&offset=0&type=3&getRead=false

// Subsequent requests
GET /items?batchSize=50&offset=50&type=3&getRead=false
GET /items?batchSize=50&offset=100&type=3&getRead=false
```

### Client Implementation

```typescript
async function fetchItems(offset = 0): Promise<Article[]> {
  const params = new URLSearchParams({
    batchSize: '50',
    offset: String(offset),
    type: '3',  // ALL
    getRead: 'false'
  });
  
  const response = await fetch(`${baseUrl}/items?${params}`, {
    headers: { Authorization: `Basic ${credentials}` }
  });
  
  const { items } = await response.json();
  return items;
}
```

### Infinite Scroll Pattern

1. Load initial batch with `offset=0`
2. When user scrolls to 75% of content, load next batch
3. Increment offset by `batchSize` for each request
4. Stop when returned items count < batchSize (no more items)
