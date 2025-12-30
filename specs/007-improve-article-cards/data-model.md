# Data Model: Improve Timeline Article Cards

## Entities

### ArticlePreview (existing)
Represents the timeline card payload.
- Fields
  - id: number
  - folderId: number
  - feedId: number
  - title: string
  - summary: string
  - url: string
  - thumbnailUrl: string | null
  - pubDate: number (unix seconds)
  - unread: boolean
  - starred: boolean
  - hasFullText: boolean

### Article (existing)
Full article content fetched on demand.
- Fields
  - id: number
  - title: string
  - author: string
  - url: string
  - body: string
  - feedId: number
  - folderId: number | null
  - unread: boolean
  - pubDate: number (unix seconds)
  - mediaThumbnail: string | null
  - mediaDescription: string | null

### TimelineCardState (new, UI-only)
Tracks per-card expansion and read toggling.
- Fields
  - articleId: number
  - isExpanded: boolean

## Relationships
- ArticlePreview.id 1:1 Article.id (fetched on expand).
- TimelineCardState.articleId 1:1 ArticlePreview.id (local UI state).

## Validation Rules
- Author line only renders when Article.author is non-empty.
- Excerpt renders when ArticlePreview.summary is non-empty; otherwise omitted.
- Full content renders when Article.body is non-empty; otherwise fallback to ArticlePreview.summary.

## State Transitions
- Collapsed -> Expanded: set isExpanded true and trigger mark-read mutation.
- Expanded -> Collapsed: set isExpanded false; read state remains true until next sync reconciliation.
