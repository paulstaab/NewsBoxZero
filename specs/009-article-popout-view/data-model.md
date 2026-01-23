# Data Model: Article Pop-out View

## Entities

### Article

Represents the unread article already present in the timeline.

**Key fields**:
- `id` (string) — unique identifier
- `title` (string) — heading
- `subtitle` (string | null) — subheading
- `body` (string) — full text
- `imageUrl` (string | null) — optional image

**Validation rules**:
- `title` and `body` are required.
- `imageUrl` is optional and must be a valid URL if present.

### PopoutState

UI state for the currently open pop-out.

**Key fields**:
- `isOpen` (boolean)
- `articleId` (string | null)
- `openedFromElementId` (string | null) — element used to restore focus

**Validation rules**:
- `articleId` is required when `isOpen` is true.
- `openedFromElementId` is captured on open and used on close.

### OverlayState

UI state for the modal overlay.

**Key fields**:
- `isVisible` (boolean)

**Validation rules**:
- `isVisible` mirrors `PopoutState.isOpen`.

## Relationships

- `PopoutState.articleId` references `Article.id` from the timeline.
- `OverlayState` is derived from `PopoutState`.

## State Transitions

- **Closed → Open**: User selects an article; `articleId` and `openedFromElementId` are set; `isOpen` becomes true.
- **Open → Closed**: User closes via button, outside click, Escape, or swipe; `isOpen` becomes false and focus returns to `openedFromElementId`.
- **Open → Open (replace)**: User selects another article while open; `articleId` updates and focus target updates.
