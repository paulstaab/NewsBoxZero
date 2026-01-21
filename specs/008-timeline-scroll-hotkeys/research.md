# Research: Timeline Scroll & Hotkeys

**Feature**: 008-timeline-scroll-hotkeys  
**Date**: 2026-01-21  
**Purpose**: Resolve technical unknowns and capture design decisions for docking, auto-read, and keyboard nav.

---

## 1. Conditional sticky positioning for docking

**Decision**: Use CSS `position: sticky; top: 0` on the folder queue element, but only activate it when the queue's original position is scrolled out of view. Use IntersectionObserver to detect this transition: when the queue element itself enters the viewport top (user scrolls back up), remove the sticky class or set `isDocked = false`; when it leaves the viewport top (user scrolls down past), add the sticky class or set `isDocked = true`.

**Rationale**: CSS sticky with conditional activation preserves the natural initial position (below heading) while enabling sticky behavior when needed. IntersectionObserver efficiently detects the transition point without a scroll listener. This avoids unwanted stickiness on page load.

**Alternatives considered**:
- Always-sticky CSS: sticks from page load, hiding the original position (not desired).
- Scroll listener with JS positioning: manual and less performant; risks jank on fast scrolls.
- Fixed positioning: breaks when queue height changes; doesn't adapt to content.

**Configuration**: 
- Apply `position: sticky; top: 0` via CSS class (e.g., `.sticky`).
- IntersectionObserver on queue with root margin to detect when original position enters/leaves viewport top.
- Toggle `.sticky` class or `isDocked` state based on threshold.
- Apply `margin-top` or padding to timeline equal to queue height when docked.

---

## 2. IntersectionObserver for auto mark-as-read

**Decision**: Use IntersectionObserver with a top sentinel (virtual element or margin) aligned to viewport top. When an unread article's bounding rect shows 100% of it is above the sentinel, mark it read and enqueue mutation. Batch writes within a 100ms debounce to avoid floods on fast scroll.

**Rationale**: IntersectionObserver is native and efficient; threshold-based tracking avoids manual scroll math. Debouncing prevents mutation spam while capturing rapid flicks.

**Alternatives considered**:
- ScrollListener + manual rect calculation: error-prone and more expensive.
- Intersection at 0% (any part visible): too aggressive; may mark items not truly past top.

**Configuration**: 
- Threshold: `[1.0]` (fully out of view upward).
- Root margin: adjust to align sentinel at top edge of viewport.
- Debounce write at 100ms to batch multiple changes.

---

## 3. Selection state management (client-only, React)

**Decision**: Store `selectedArticleId: number | null` in a local React state hook (`useTimelineSelection`). First arrow press selects the article at the viewport top (measure via `getBoundingClientRect()` or iterate visible list). Subsequent presses move selection and trigger scroll-into-view. Deselecting an article marks it read if unread.

**Rationale**: Selection is ephemeral (lost on reload per spec); keeping it client-only avoids sync complications. A focused hook simplifies testing and reuse.

**Alternatives considered**:
- Store in URL params: overkill for client-only state; pollutes history.
- Redux/Context: unnecessary for single simple state atom.

**Hook shape**:
```typescript
function useTimelineSelection(articles: Article[]) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const select = (id: number) => setSelectedId(id);
  const deselect = () => setSelectedId(null);
  const next = () => { /* move to next */ };
  const prev = () => { /* move to previous */ };
  return { selectedId, select, deselect, next, prev };
}
```

---

## 4. Keyboard event handling & focus guard

**Decision**: Attach keydown listener to the timeline container. Check if active element is the timeline or a descendant (not input/textarea/contenteditable). Only then process Arrow Up/Down. Use `event.preventDefault()` to prevent default scroll behavior when handling.

**Rationale**: Focus guards prevent conflicts with text inputs and other interactive controls. Container-level listeners are efficient and naturally scoped.

**Alternatives considered**:
- Global listener with complex checks: fragile and less performant.
- Role-based check (aria-role): requires correct ARIA setup; focus check is more reliable.

**Implementation**: Wrap timeline in a div with `onKeyDown` handler or use `useEffect` with addEventListener.

---

## 5. Mark-as-read mutation & idempotency

**Decision**: Reuse existing read-mutation API (e.g., `api/items.ts` mark-read endpoint). Track pending reads in a Set to avoid duplicate enqueue. On success, remove from pending; on failure, retry per existing backoff rules.

**Rationale**: Avoids duplicate requests and fits within existing offline queue (IndexedDB) if present. Idempotency is free for HTTP POST to mark-read endpoints.

**Alternatives considered**:
- Separate mutation queue: complicates state; existing queue already handles sync.
- Batch all reads at end of session: risky (loses reads if crash before sync).

**Implementation**: 
```typescript
const pendingReads = useRef(new Set<number>());
const markRead = async (articleId: number) => {
  if (pendingReads.current.has(articleId)) return;
  pendingReads.current.add(articleId);
  try {
    await api.items.markRead(articleId);
    pendingReads.current.delete(articleId);
  } catch (e) {
    // enqueue in mutation queue per existing rules
  }
};
```

---

## 6. Item visibility & session state

**Decision**: Items marked read remain in the DOM and visible until page reload. The `unread` flag flips locally; if offline, the mutation queues. On reload, fresh fetch uses `getRead=false` so read items are excluded (per unread-only policy).

**Rationale**: Matches spec expectation and respects Constitution VI. Keeps UX smooth within session; fresh fetch on reload maintains unread focus.

**Alternatives considered**:
- Remove items from list on mark-read: loses context; unexpected to users.
- Fetch `getRead=true` after marking: violates unread-only; pollutes cache.

---

## 7. Scroll-into-view & animation

**Decision**: Use `element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })` when moving selection. Avoids jarring jumps; ensures selected item is visible without overshooting.

**Rationale**: Native API; no external dependencies. Smooth behavior enhances UX.

**Alternatives considered**:
- Manual scroll calculation: fragile and verbose.
- Instant scroll: jarring and less accessible.

---

## 8. Selection styling & accessibility

**Decision**: Apply a distinct visual state (e.g., border, background, or shadow) to selected article that differs from read/unread styling. Use `aria-selected="true"` on selected element. Ensure focus ring is visible when keyboard user moves selection.

**Rationale**: WCAG 2.1 AA requires distinguishable states. aria-selected helps screen readers. Focus ring confirms keyboard activity.

**Alternatives considered**:
- Reuse read/unread styling: confusing; users won't distinguish states.

---

## 9. Responsive behavior & docking on small screens

**Decision**: Queue docks with CSS sticky; timeline adds dynamic top margin equal to queue height (measured via ResizeObserver). At small screens (320px), queue may shrink or reflow to avoid overlaps; timeline adapts accordingly. Test across all breakpoints.

**Rationale**: Responsive docking ensures usability without manual layout switches.

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Docking | CSS `position: sticky` + ResizeObserver for height offset |
| Auto mark-as-read | IntersectionObserver threshold 1.0 + 100ms debounce |
| Selection state | React hook (client-only); first key press selects top-most visible |
| Keyboard events | Listener on timeline with focus guard (no input hijacking) |
| Mark-read mutations | Reuse existing API + idempotency check (Set) |
| Item visibility | Stay rendered until reload; fresh fetch on next load filters out reads |
| Scroll behavior | `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` |
| Selection styling | Distinct visual + aria-selected |
| Responsive | Sticky + dynamic margin; test 320/768/1024/1440 |
