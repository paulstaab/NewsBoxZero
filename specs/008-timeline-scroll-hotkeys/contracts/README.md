# Contracts: Timeline Scroll & Hotkeys

**Feature**: 008-timeline-scroll-hotkeys  
**Date**: 2026-01-21  
**Scope**: DOM events, state interfaces, and observer patterns for docking, auto-read, and keyboard nav.

---

## Component & Hook Contracts

### `<TimelineWithSelection />` (or extended existing)

**Props**:
```typescript
interface TimelineProps {
  articles: Article[];
  onMarkRead: (articleId: number) => void | Promise<void>;
  isLoading: boolean;
}
```

**DOM requirements**:
- Container div with `ref` (for focus guard) and `onKeyDown` handler.
- Each article renders as a focusable element with `role="article"` or semantic `<article>` tag.
- Folder queue rendered inside timeline container; will be sticky-positioned.

**Emitted events**:
- `onMarkRead` called when article scrolls past top or keyboard deselects.

---

### `useTimelineSelection(articles: Article[])` Hook

**Returns**:
```typescript
interface UseTimelineSelectionReturn {
  selectedId: number | null;
  isSelected: (id: number) => boolean;
  selectTopmost: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  deselect: () => void;
}
```

**Behavior**:
- On first call to `selectTopmost()`, selects the topmost visible article.
- `selectNext()` and `selectPrevious()` navigate the visible article list; no-op at boundaries.
- `deselect()` clears selection; caller decides whether to mark read.

---

### `useFolderQueueDocking()` Hook

**Returns**:
```typescript
interface UseFolderQueueDockingReturn {
  isDocked: boolean;
  dockedHeight: number;
  queueRef: React.RefObject<HTMLDivElement>;
}
```

**Side effects**:
- Attaches ResizeObserver to `queueRef` to track height.
- Attaches IntersectionObserver to detect when queue enters docked state.
- Updates state reactively.

---

### `useAutoMarkReadOnScroll(articles: Article[], onMarkRead: (id: number) => void)` Hook

**Behavior**:
- Creates IntersectionObserver sentinel at viewport top.
- When an unread article fully crosses above top, calls `onMarkRead(id)` (batched with 100ms debounce).
- Cleans up observers on unmount.

---

### Keyboard Event Handler Contract

```typescript
interface KeyboardHandlerContext {
  timeline: React.RefObject<HTMLDivElement>;
  selection: UseTimelineSelectionReturn;
  onMarkRead: (id: number) => void;
}

function handleTimelineKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  context: KeyboardHandlerContext
): void {
  // Skip if focus is in input/textarea/contenteditable
  if (isInputElement(document.activeElement)) {
    return;
  }
  
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (context.selection.selectedId === null) {
      context.selection.selectTopmost();
    } else {
      const prev = context.selection.selectedId;
      context.selection.selectNext();
      // Mark previous as read on deselection
      if (prev !== null && prev !== context.selection.selectedId) {
        context.onMarkRead(prev);
      }
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (context.selection.selectedId === null) {
      context.selection.selectTopmost();
    } else {
      const prev = context.selection.selectedId;
      context.selection.selectPrevious();
      // Mark previous as read on deselection
      if (prev !== null && prev !== context.selection.selectedId) {
        context.onMarkRead(prev);
      }
    }
  }
}
```

---

## Observer Contracts

### IntersectionObserver for Docking

**Config**:
```typescript
const dockingObserverOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px',
  threshold: [0, 1],
};
```

**Callback**: When threshold changes from 1 to 0 (queue fully out of view), set `isDocked = true`.

---

### IntersectionObserver for Auto Mark-Read

**Config**:
```typescript
const autoReadObserverOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px -0px -0px -0px', // adjust if sentinel margin needed
  threshold: [1.0], // 100% of article above sentinel
};
```

**Callback**: Collect article IDs crossing threshold; debounce mark-read calls by 100ms.

---

### ResizeObserver for Queue Height

**Callback**: Measure queue element height; update timeline top margin/padding.

```typescript
const resizeObserverCallback: ResizeObserverCallback = (entries) => {
  for (const entry of entries) {
    const height = entry.contentRect.height;
    setDockedHeight(height);
    // Apply margin to timeline
  }
};
```

---

## State Mutation Contracts

### Mark Article as Read

```typescript
async function markArticleRead(articleId: number): Promise<void> {
  // Optimistic update: flip local state immediately
  updateLocalReadIds(id => new Set(id).add(articleId));
  updatePendingReadIds(id => new Set(id).add(articleId));
  
  try {
    // Call existing API
    await api.items.markRead(articleId);
    // Success: remove from pending
    updatePendingReadIds(id => {
      id.delete(articleId);
      return id;
    });
  } catch (error) {
    // Failure: keep in pending for retry per existing queue rules
    // Could also enqueue in offline mutation queue here
  }
}
```

---

## CSS Contract

### Sticky Folder Queue

```css
.folder-queue {
  position: sticky;
  top: 0;
  z-index: 10; /* above timeline but below modals */
  background: inherit; /* match page background */
}

.timeline {
  margin-top: var(--docked-queue-height, 0px);
  /* or use padding-top if margin doesn't work with grid layout */
}

/* Selection styling */
.article.is-selected {
  outline: 2px solid var(--focus-color, blue);
  outline-offset: 2px;
  /* OR */
  background-color: rgba(0, 0, 255, 0.1);
  border: 1px solid currentColor;
}

/* Read state (distinct from selection) */
.article.is-read {
  opacity: 0.7;
  color: var(--text-secondary, #666);
}

/* Both selected and read */
.article.is-selected.is-read {
  outline: 2px solid var(--focus-color);
  opacity: 1; /* show clearly even if read */
}
```

---

## Testing Contracts

### Unit Tests

- `useTimelineSelection`: select/deselect/next/prev logic; boundary checks.
- `useFolderQueueDocking`: observer setup/cleanup; height tracking.
- `useAutoMarkReadOnScroll`: debouncing; idempotency of mark-read calls.
- `handleTimelineKeyDown`: focus guard; event prevent default; selection updates.

### E2E Tests

- Docking: scroll past queue, confirm it sticks to top.
- Auto mark-read: scroll articles past top, confirm they're marked read and remain visible.
- Keyboard nav: use only arrow keys; select/deselect; confirm visual feedback.
- Focus guard: type in search, confirm arrow keys don't navigate articles.
- Multiple reads: mark several articles read; reload; confirm they don't reappear.

---

## Responsive Contract

All behaviors must work across:
- 320px: single column; queue may stack; timeline readable.
- 768px: sidebar + timeline; queue docks above timeline.
- 1024px+: multi-column; queue remains accessible and docked.

Visual regression tests required at each breakpoint.
