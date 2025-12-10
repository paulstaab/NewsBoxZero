# API Contracts: Nextcloud News v1.3

**Feature**: 001-static-rss-app  
**Date**: 2025-12-10  
**Base Path**: `/index.php/apps/news/api/v1-3`  
**Authentication**: HTTP Basic (`Authorization: Basic base64(username:password)`)

---

## Overview

This document defines the API contracts for Feedfront's integration with headless-rss using the Nextcloud News v1.3 API. All endpoints require HTTP Basic authentication over HTTPS.

### Type Constants

```typescript
enum ItemType {
  FEED = 0,
  FOLDER = 1,
  STARRED = 2,
  ALL = 3
}
```

---

## Endpoints Index

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Version | `/version` | GET | Check API version |
| Feeds | `/feeds` | GET | List all feeds |
| Feeds | `/feeds` | POST | Add new feed |
| Feeds | `/feeds/{feed_id}` | DELETE | Delete feed |
| Feeds | `/feeds/{feed_id}/move` | POST | Move feed to folder |
| Feeds | `/feeds/{feed_id}/rename` | POST | Rename feed |
| Feeds | `/feeds/{feed_id}/read` | POST | Mark feed items as read |
| Items | `/items` | GET | List items with filters |
| Items | `/items/updated` | GET | Get recently updated items |
| Items | `/items/{item_id}/read` | POST | Mark item as read |
| Items | `/items/{item_id}/unread` | POST | Mark item as unread |
| Items | `/items/{item_id}/star` | POST | Star item |
| Items | `/items/{item_id}/unstar` | POST | Unstar item |
| Items | `/items/read/multiple` | POST | Bulk mark read |
| Items | `/items/unread/multiple` | POST | Bulk mark unread |
| Items | `/items/star/multiple` | POST | Bulk star |
| Items | `/items/unstar/multiple` | POST | Bulk unstar |
| Items | `/items/read` | POST | Mark all items read |
| Folders | `/folders` | GET | List all folders |
| Folders | `/folders` | POST | Create folder |
| Folders | `/folders/{folder_id}` | PUT | Rename folder |
| Folders | `/folders/{folder_id}` | DELETE | Delete folder |
| Folders | `/folders/{folder_id}/read` | POST | Mark folder items as read |
