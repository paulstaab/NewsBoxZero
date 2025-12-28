# API Contracts: Folder Queue Pills

**Feature**: 004-folder-queue-pills  
**Date**: 2025-12-28  
**Base Path**: `/index.php/apps/news/api/v1-3`  
**Authentication**: HTTP Basic (`Authorization: Basic base64(username:password)`)

## Overview

Folder queue pills reuse the existing Nextcloud News API. No new endpoints are required; the queue is derived from unread items already returned by `/items` plus folder metadata from `/folders` and feed mappings from `/feeds`.

## Endpoints Index

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Folders | `/folders` | GET | Fetch folder metadata for pill labels |
| Feeds | `/feeds` | GET | Map feeds to folder IDs for unread aggregation |
| Items | `/items` | GET | Fetch unread items to build the queue |
| Items | `/items/{item_id}/read` | POST | Mark a single item read (timeline list action) |
| Items | `/items/read/multiple` | POST | Mark all items in the active folder read |

See `folder-queue-pills.md` for request/response details.
