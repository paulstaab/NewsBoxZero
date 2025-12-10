# Feeds API Contract

**Base Path**: `/index.php/apps/news/api/v1-3/feeds`

---

## GET /feeds

Fetch all subscribed feeds.

### Request

```http
GET /index.php/apps/news/api/v1-3/feeds HTTP/1.1
Authorization: Basic base64(username:password)
```

### Response

```typescript
interface FeedGetOut {
  feeds: Feed[];
}

interface Feed {
  id: number;
  url: string;
  title: string | null;
  faviconLink: string | null;
  added: number;              // Unix timestamp
  nextUpdateTime: number | null;
  folderId: number | null;    // null = root level
  ordering: number;
  link: string | null;        // Website URL
  pinned: boolean;
  updateErrorCount: number;
  lastUpdateError: string | null;
}
```

### Example Response

```json
{
  "feeds": [
    {
      "id": 1,
      "url": "https://example.com/feed.xml",
      "title": "Example Blog",
      "faviconLink": "https://example.com/favicon.ico",
      "added": 1702200000,
      "nextUpdateTime": 1702203600,
      "folderId": null,
      "ordering": 0,
      "link": "https://example.com",
      "pinned": false,
      "updateErrorCount": 0,
      "lastUpdateError": null
    }
  ]
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Invalid credentials |

---

## POST /feeds

Add a new feed subscription.

### Request

```http
POST /index.php/apps/news/api/v1-3/feeds HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface FeedPostIn {
  url: string;              // Feed URL to subscribe
  folderId: number | null;  // Target folder, null for root
}
```

### Example Request

```json
{
  "url": "https://blog.example.com/rss",
  "folderId": 5
}
```

### Response

```typescript
interface FeedPostOut {
  feeds: Feed[];            // Array with single newly created feed
  newestItemId: number | null;
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Feed created |
| 401 | Invalid credentials |
| 422 | Validation error (invalid URL, already subscribed) |

---

## DELETE /feeds/{feed_id}

Delete a feed subscription.

### Request

```http
DELETE /index.php/apps/news/api/v1-3/feeds/{feed_id} HTTP/1.1
Authorization: Basic base64(username:password)
```

### Parameters

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| feed_id | path | integer | Yes | Feed ID to delete |

### Response

Empty object on success.

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Feed deleted |
| 401 | Invalid credentials |
| 404 | Feed not found |
| 422 | Validation error |

---

## POST /feeds/{feed_id}/move

Move a feed to a different folder.

### Request

```http
POST /index.php/apps/news/api/v1-3/feeds/{feed_id}/move HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface MoveFeedIn {
  folderId: number | null;  // Target folder, null for root
}
```

### Example Request

```json
{
  "folderId": 3
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Feed moved |
| 401 | Invalid credentials |
| 404 | Feed or folder not found |
| 422 | Validation error |

---

## POST /feeds/{feed_id}/rename

Rename a feed.

### Request

```http
POST /index.php/apps/news/api/v1-3/feeds/{feed_id}/rename HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

```typescript
interface RenameFeedIn {
  feedTitle: string;  // New feed title
}
```

### Example Request

```json
{
  "feedTitle": "My Custom Feed Name"
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Feed renamed |
| 401 | Invalid credentials |
| 404 | Feed not found |
| 422 | Validation error |

---

## POST /feeds/{feed_id}/read

Mark all items in a feed as read up to a specific item ID.

### Request

```http
POST /index.php/apps/news/api/v1-3/feeds/{feed_id}/read HTTP/1.1
Authorization: Basic base64(username:password)
Content-Type: application/json
```

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

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Items marked as read |
| 401 | Invalid credentials |
| 404 | Feed not found |
| 422 | Validation error |

---

## Error Response

All endpoints may return validation errors:

```typescript
interface HTTPValidationError {
  detail: ValidationError[];
}

interface ValidationError {
  loc: (string | number)[];  // Location of error
  msg: string;               // Error message
  type: string;              // Error type
}
```

### Example Error

```json
{
  "detail": [
    {
      "loc": ["body", "url"],
      "msg": "invalid url format",
      "type": "value_error.url"
    }
  ]
}
```
