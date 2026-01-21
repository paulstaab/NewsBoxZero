# Implementation Plan: Timeline Scroll & Hotkeys

**Branch**: `008-timeline-scroll-hotkeys` | **Date**: 2026-01-21 | **Spec**: [specs/008-timeline-scroll-hotkeys/spec.md](specs/008-timeline-scroll-hotkeys/spec.md)

## Summary

Add conditional sticky folder queue docking (sticky only after scrolled past; unsticks when scrolled back to top), auto mark articles read when they cross the top of the viewport, keyboard Arrow Up/Down navigation with selection, and keep read items visible until reload. Preserve unread-only fetches; read state changes occur locally and sync per existing rules without removing items mid-session.

## Technical Context

- **Stack**: TypeScript 5.9, Next.js 16 App Router, React 19, SWR, Tailwind CSS 4.1, date-fns 4.1.
- **Relevant areas**: `src/app/timeline`, `src/components/timeline/*`, `src/hooks/useItems.ts`, `src/hooks/useFolderQueue.ts`, `src/lib/sync/*` for read mutations, `src/styles/tokens.css`.
- **Input constraints**: No SSR/API routes; static export with client fetch. Unread-only fetch policy remains (getRead=false) while allowing locally-marked read items to stay rendered until reload.
- **Data**: Articles already typed; add selection state client-side only. Read mutations should reuse existing mutation queue (IndexedDB/online sync if present in base app).
- **Perf**: Keep observers lightweight; avoid re-render storms while scrolling. Cap observers to visible window plus buffer.

## Constitution Check (pre-implementation)

1. **Simplicity First**: Single-frontend change only; no new services or feature flags beyond existing config. Use CSS `position: sticky` with minimal JS for docking; reuse existing mutation queue for read state.
2. **Code Quality Discipline**: Guard with `npm run format`, `npm run lint:fix`, `npm run typecheck`, existing unit/e2e suites. Keep selection/docking logic isolated (hooks/utilities) with clear comments where logic is non-obvious.
3. **Static Delivery Mandate**: Client-only behavior; maintain `output: 'export'`. No new runtime compute or APIs. All logic runs in browser after hydration.
4. **Right-Sized Tests**: Unit tests for scroll threshold logic, selection reducer, and read-mark triggers. E2E for docking, auto-read on scroll, keyboard navigation, focus-guard. Visual regression for docked queue + selected article.
5. **Experience Consistency**: Use tokens for spacing/typography; ensure focus order and WCAG AA contrast for selection highlight; verify across 320/768/1024/1440 breakpoints.
6. **Unread-Only Focus**: Continue fetching unread-only; items marked read locally stay visible until reload per spec and are evicted on next sync/reload. Do not fetch historical read items.

## Work Plan

1. **Folder queue docking (conditional)**
   - Implement sticky behavior via CSS (`position: sticky; top: 0`) with conditional activation: queue is only sticky while its original position is scrolled out of view.
   - Add IntersectionObserver on queue element: when it enters the viewport top (user scrolls back up), remove sticky class or adjust state; when it leaves the viewport top (user scrolls down), apply sticky class.
   - Adjust timeline top padding/margin dynamically based on queue height when docked to avoid overlap; listen to ResizeObserver for queue height changes.
   - Ensure responsive behavior across breakpoints; confirm no overlap on small screens.
   - Test unsticking: scroll back to top → queue should unstick and return to natural position below heading.

2. **Auto mark-as-read on scroll**
   - Use IntersectionObserver with a top sentinel aligned to the viewport top; when an unread article fully crosses the top edge, trigger local mark-read and enqueue mutation.
   - Debounce or batch writes to avoid flooding read mutations during fast flicks; ensure idempotent marking.
   - Keep items rendered; only state flips to read.

3. **Keyboard navigation & selection**
   - Track `selectedArticleId` in timeline state (client-only). On first Arrow Up/Down press with no selection, select the top-most visible article (measure via bounding rect or maintain list of visible items).
   - Arrow Down/Up moves selection by one; scroll into view if needed (e.g., `scrollIntoView({ block: 'nearest' })`). Prevent moving above first item.
   - When selection moves away from an article, mark it read (if previously unread) but leave it visible.
   - Ensure hotkeys only active when timeline region has focus; ignore when focus is in inputs/search.
   - Provide clear selection styling distinct from read/unread state; ensure focus ring/aria-selected.

4. **Persistence & sync**
   - Reuse existing read-state mutation queue; avoid duplicate requests if scroll and keyboard both mark the same item.
   - Maintain compatibility with offline mode: queue mutations when offline and replay later; UI reflects optimistic read state immediately.

5. **Testing & validation**
   - **Unit**: selection reducer logic, top-edge crossing detector, observer utilities, debounce/batching.
   - **E2E**: docking behavior, auto-read on scroll (with rapid scroll), keyboard navigation (first press selects top, up/down boundaries), focus guard when typing in inputs, items remain visible after read.
   - **Visual**: snapshots of docked queue + selected article across breakpoints.

## Project Structure

- `src/app/timeline/` and `src/components/timeline/`: entry points for timeline view, article list, folder queue.
- `src/hooks/`: add or extend hooks for selection state (`useTimelineSelection`), scroll/read observer, folder queue docking state.
- `src/lib/sync/` or `src/lib/api/`: ensure read mutation helper is reused; batching/de-dupe lives here if not already.
- `tests/e2e/`: add scenarios for docking, auto-read, keyboard navigation, focus guard.
- `tests/unit/`: add unit tests for selection logic and observer utilities.

## Risks / Mitigations

- **Missed read marks on fast scroll**: Use IntersectionObserver thresholds and batching to ensure every item crossing top is captured.
- **Focus conflicts**: Scope keyboard handlers to timeline container; skip when active element is input/textarea/contenteditable.
- **Layout shift/overlap**: Measure docked queue height and apply spacer; test small screens.
- **Duplicate read mutations**: Track pending/read state locally and suppress duplicate enqueue.

## Success Metrics Mapping

- SC-001: Docked queue remains visible during long scrolls (manual + e2e verification).
- SC-002: 95% of items marked read within 0.5s after crossing top (measure via integration test timing or logs in e2e).
- SC-003: Arrow key nav through 10 items without pointer; selection visible and correct (e2e).
- SC-004: <1% accidental read changes while typing elsewhere; enforced by focus guards in tests.
