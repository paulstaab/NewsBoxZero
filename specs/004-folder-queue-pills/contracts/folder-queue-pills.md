# API Contract: Folder Queue Pills

**Feature**: 004-folder-queue-pills  
**Date**: 2025-12-28  
**Base Path**: `/index.php/apps/news/api/v1-3`

## 1. GET /folders

**Purpose**: Provide folder names and IDs for pill labels.

**Request**

- Method: `GET`
- Path: `/folders`
- Query: none

**Response**

```json
{
  "folders": [
    {
      "id": 12,
      "name": "Tech News",
      "feeds": [3, 5],
      "parentId": null,
      "opened": true
    }
  ]
}
```

## 2. GET /feeds

**Purpose**: Map feed IDs to folder IDs for unread aggregation.

**Request**

- Method: `GET`
- Path: `/feeds`

**Response**

```json
{
  "feeds": [
    {
      "id": 3,
      "title": "Daily Tech",
      "folderId": 12
    }
  ]
}
```

## 3. GET /items

**Purpose**: Fetch unread items for queue building and timeline list.

**Request**

- Method: `GET`
- Path: `/items`
- Query (default for timeline):
  - `type=3` (all items)
  - `id=0`
  - `getRead=false` (unread only)
  - `oldestFirst=false`
  - `batchSize=50`
  - `offset=0`

**Response**

```json
{
  "items": [
    {
      "id": 991,
      "feedId": 3,
      "folderId": 12,
      "title": "AI Notes",
      "unread": true,
      "starred": false,
      "pubDate": 1735360000
    }
  ]
}
```

## 4. POST /items/read/multiple

**Purpose**: Mark all items in the active folder as read (mark-all action).

**Request**

- Method: `POST`
- Path: `/items/read/multiple`
- Body:

```json
{
  "items": [991, 992, 993]
}
```

**Response**

- `200 OK` with empty body

## 5. POST /items/{item_id}/read

**Purpose**: Mark a single article read when opened/expanded.

**Request**

- Method: `POST`
- Path: `/items/{item_id}/read`

**Response**

- `200 OK` with empty body
