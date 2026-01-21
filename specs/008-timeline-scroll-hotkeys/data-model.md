# Data Model: Timeline Scroll & Hotkeys

**Feature**: 008-timeline-scroll-hotkeys  
**Date**: 2026-01-21  
**Purpose**: Define state and entities for docking, selection, and auto-read behavior.

---

## 1. TimelineViewportState (client-only)

**Purpose**: Tracks scroll position, selected article, and docking state of the folder queue.

```typescript
interface TimelineViewportState {
  /** Currently focused/selected article ID, null if none */
  selectedArticleId: number | null;
  
  /** Whether folder queue is in docked state (sticky top) */
  isDocked: boolean;
  
  /** Height of docked folder queue (in px); used for timeline offset */
  dockedQueueHeight: number;
  
  /** ID of the topmost visible article in viewport */
  topMostVisibleArticleId: number | null;
  
  /** Set of article IDs marked read in current session (not yet persisted) */
  localReadIds: Set<number>;
  
  /** Set of article IDs with pending mark-as-read mutations */
  pendingReadIds: Set<number>;
}
```

**Storage**: React state only (lost on reload per spec). No persistence to localStorage or IndexedDB for selection/docking state.

**Validation Rules**: All IDs must be valid article references; sets auto-deduplicate.

---

## 2. Article (extended with session state)

**Purpose**: Existing article type now includes transient selection and local read flags.

```typescript
interface ArticleWithSessionState extends Article {
  /** Whether article is currently keyboard-selected */
  isSelected: boolean;
  
  /** Whether article was marked read in current session (may not be synced yet) */
  isLocallyRead: boolean;
  
  /** Whether article is pending a read mutation */
  isPendingRead: boolean;
}
```

**Computation**: Derived from `Article`, `selectedArticleId`, `localReadIds`, `pendingReadIds` in viewport state.

**Rendering**: Display `isSelected` with distinct styling; display read state even if `isLocallyRead` is true (per spec: items remain visible).

---

## 3. FolderQueueDockingState (client-only)

**Purpose**: Tracks docking behavior of the folder queue.

```typescript
interface FolderQueueDockingState {
  /** Whether queue has scrolled out of its natural position */
  isDocked: boolean;
  
  /** Current height of queue element (px) */
  height: number;
  
  /** Whether queue is being resized (for smooth transitions) */
  isResizing: boolean;
}
```

**Observers**: 
- `IntersectionObserver` on queue element to detect when it becomes pinned.
- `ResizeObserver` to track height changes and update timeline offset.

---

## 4. SelectionNavigationState (client-only)

**Purpose**: Encapsulates keyboard navigation logic.

```typescript
interface SelectionNavigationState {
  /** Current selection, or null */
  selectedId: number | null;
  
  /** Ordered list of visible article IDs (for next/prev lookup) */
  visibleArticleIds: number[];
  
  /** Whether selection has moved via keyboard (used for initial focus) */
  hasKeyboardSelection: boolean;
}

interface SelectionActions {
  selectTopmost: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  deselect: (markReadOnDeselect: boolean) => void;
}
```

**State Machine**:
```
[No selection] --first arrow press--> [Select topmost visible] 
                                              │
                                   --arrow down--> [Select next]
                                              │
                                   --arrow up--> [Select previous or stay]
                                              │
                                   --arrow press while no more items--> [Stay]
```

---

## 5. ReadMutationQueue (extends existing)

**Purpose**: Track locally-marked reads and pending mutations.

```typescript
interface LocalReadState {
  /** Articles marked read in this session (not yet confirmed by API) */
  localReads: Map<number, { markedAt: number }>;
  
  /** Articles with in-flight read mutations */
  pendingReads: Set<number>;
  
  /** On next sync/reload, these articles will be evicted per unread-only policy */
  toEvict: number[];
}
```

**Sync behavior**: 
- On sync success, move from `pendingReads` to `toEvict`.
- On page reload, fetch fresh articles with `getRead=false`; old reads are filtered out.

---

## 6. Intersection Observer Sentinel

**Purpose**: Detects when articles cross the top viewport edge.

```typescript
interface IntersectionSentinel {
  /** Virtual element positioned at viewport top for threshold detection */
  targetElement: HTMLElement | null;
  
  /** Callback when an article fully crosses above top */
  onArticleCrossedTop: (articleId: number) => void;
  
  /** Debounce timer for batching mark-as-read calls */
  debounceTimerId: NodeJS.Timeout | null;
  
  /** Pending articles to mark read (batched) */
  pendingMarkRead: number[];
}
```

**Behavior**: When article's bottom edge crosses above sentinel, debounce and mark read.

---

## 7. Keyboard Event Context

**Purpose**: Manage keyboard handlers and focus guards.

```typescript
interface KeyboardContext {
  /** Reference to timeline container (for focus check) */
  timelineRef: React.RefObject<HTMLDivElement>;
  
  /** Whether timeline container currently has focus */
  isTimelineFocused: boolean;
  
  /** Suppress keyboard handlers when this element has focus */
  excludeFocusSelectors: string[]; // e.g., ['input', 'textarea', '[contenteditable]']
}
```

**Handler logic**:
```typescript
function handleKeyDown(event: KeyboardEvent, context: KeyboardContext) {
  // Skip if focus is in an excluded element
  if (isExcludedFocus(context)) return;
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    // ... selection logic
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    // ... selection logic
  }
}
```

---

## Type Exports

All types exported from `src/types/`:

```typescript
// src/types/timeline.ts (new or extended)
export type { TimelineViewportState, ArticleWithSessionState };
export type { FolderQueueDockingState, SelectionNavigationState, SelectionActions };
export type { LocalReadState, KeyboardContext };
```

---

## Computed/Derived State

| Derived | Source | Computation |
|---------|--------|-------------|
| `visibleArticles` | timeline DOM + state | Filter articles in viewport using getBoundingClientRect() |
| `topMostVisibleId` | visibleArticles | First article with positive top offset |
| `isDocked` | IntersectionObserver | Queue has scrolled past original position |
| `dockedQueueHeight` | ResizeObserver | Measure queue element height |
| `isSelected` (per article) | `selectedArticleId` state | `article.id === selectedArticleId` |
| `isLocallyRead` (per article) | `localReadIds` set | `localReadIds.has(article.id)` |
| `displayRead` (per article) | `article.unread` + `isLocallyRead` | `!article.unread || isLocallyRead` |

---

## Caching & Eviction

- **Selection state**: Lost on reload (ephemeral; not persisted).
- **Local reads**: Evicted on next API sync or page reload.
- **Mutation queue**: Existing offline queue (IndexedDB) continues to handle retry/backoff; no new caching for this feature.

---

## Accessibility Attributes

Articles should support:
- `aria-selected="true"` when selected
- `aria-label="Article: {title}"` for screen reader context
- Keyboard focus ring visible on selected article
- Focus order: sidebar → folder queue → first article → next/prev via arrow keys
