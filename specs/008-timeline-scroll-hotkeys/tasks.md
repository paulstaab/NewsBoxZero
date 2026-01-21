# Tasks: Timeline Scroll & Hotkeys

**Feature**: 008-timeline-scroll-hotkeys  
**Branch**: `008-timeline-scroll-hotkeys`  
**Date**: 2026-01-21  
**Status**: Ready for implementation

---

## Phase 1: Setup & Infrastructure

- [x] T001 Create hook skeleton files: `src/hooks/useTimelineSelection.ts`, `src/hooks/useFolderQueueDocking.ts`, `src/hooks/useAutoMarkReadOnScroll.ts` (Note: read mutations reuse existing API pattern; no new mutation hook needed)
- [x] T002 Create utility files for selection logic: `src/lib/timeline/selection.ts` (next/prev/topmost logic)
- [x] T003 Create utility for debounced mark-read batching: `src/lib/timeline/read-batching.ts`
- [x] T004 Add selection color tokens to `src/styles/tokens.css` if missing (e.g., `--color-selection`, `--color-selection-bg`)
- [x] T005 Add TypeScript types to `src/types/timeline.ts` (TimelineViewportState, SelectionNavigationState, FolderQueueDockingState from data-model.md; ensure all types are defined before Phase 2 begins)

## Phase 2: Conditional Sticky Docking

- [x] T006 [P] Implement CSS sticky class in `src/styles/globals.css` or Tailwind (`.sticky { position: sticky; top: 0; z-index: 10; }`)
- [x] T007 [P] Implement `useFolderQueueDocking()` hook with IntersectionObserver to toggle docking state
- [x] T008 [P] IntersectionObserver configuration: detect when queue element enters/leaves viewport top; toggle `isDocked` state
- [x] T009 [P] Attach ResizeObserver in `useFolderQueueDocking()` to track queue height dynamically
- [x] T010 [P] Apply dynamic `margin-top` or `padding-top` to timeline based on `dockedQueueHeight` when `isDocked = true`
- [x] T011 [P] Bind `useFolderQueueDocking()` hook in `src/components/timeline/Timeline.tsx` component
- [x] T012 [P] Add `.sticky` class toggle logic: add class when `isDocked = true`, remove when `isDocked = false`
- [ ] T013 Unit test: `useFolderQueueDocking` - observer setup/cleanup, height tracking, docking state transitions
- [ ] T014 E2E test: Initial page load - queue appears in natural position (not sticky), below heading
- [ ] T015 E2E test: Scroll down - queue sticks to top after original position leaves viewport
- [ ] T016 E2E test: Scroll back up - queue unsticks and returns to natural position below heading

## Phase 3: Auto Mark-as-Read on Scroll

- [x] T017 [P] Implement `useAutoMarkReadOnScroll()` hook with IntersectionObserver (threshold `[1.0]` to detect full cross above top)
- [x] T018 [P] Create debounced mark-read batcher in `src/lib/timeline/read-batching.ts` (100ms debounce window)
- [x] T019 [P] Implement idempotency check (Set) to prevent duplicate mark-read enqueue for same article
- [x] T020 [P] Integrate hook into `src/components/timeline/Timeline.tsx` component; bind `onMarkRead` callback
- [x] T021 [P] Call existing `api.items.markRead(id)` API when article crosses top edge; use try-catch for network errors
- [x] T022 [P] Ensure marked articles remain visible in DOM (flip `unread` state only; do not remove elements)
- [ ] T023 [P] Integrate with existing offline mutation queue if present; queue reads when offline
- [ ] T024 Unit test: debouncing logic - batch multiple crosses within 100ms window into single batch
- [ ] T025 Unit test: idempotency set - same article ID marked read twice doesn't duplicate enqueue
- [ ] T026 Unit test: IntersectionObserver threshold detection - article marked read only when 100% crosses above top
- [ ] T027 E2E test: Single article scrolls past top → marked read within 0.5s, remains visible
- [ ] T028 E2E test: Rapid scroll (10+ articles cross top rapidly) → all articles marked read, none missed
- [ ] T029 E2E test: Very short article near top → not marked until fully crosses (test 100% threshold)
- [ ] T030 E2E test: Reload page after marking articles → marked articles do not reappear (fresh fetch with `getRead=false`)

## Phase 4: Keyboard Selection & Navigation

- [x] T031 Implement `useTimelineSelection()` hook with selection state (`selectedArticleId`) and actions (selectTopmost, selectNext, selectPrevious, deselect)
- [x] T032 [P] Implement selection reducer logic in `src/lib/timeline/selection.ts`: next/prev with boundary checks (no wrap, stay on first)
- [x] T033 [P] Implement topmost-visible detection in `src/lib/timeline/selection.ts`: use `getBoundingClientRect()` or maintain visible article list
- [x] T034 [P] Implement `handleTimelineKeyDown()` event handler in `src/lib/timeline/keyboard-handler.ts` with focus guard (check `document.activeElement`)
- [x] T035 [P] Focus guard: skip keyboard handlers if focus is on input, textarea, or contenteditable element (list in `excludeFocusSelectors`)
- [x] T036 [P] Add keydown listener to timeline container in `src/components/timeline/Timeline.tsx`
- [x] T037 [P] On first Arrow Down or Arrow Up (no selection): call `selectTopmost()` to select top-most visible article
- [x] T038 [P] On subsequent Arrow Down: call `selectNext()`, mark previous article as read, scroll into view (call `onMarkRead(previousId)`)
- [x] T039 [P] On Arrow Up: call `selectPrevious()`, mark previous article as read (call `onMarkRead(previousId)`)
- [x] T040 [P] Implement `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` on selection change to keep selected article visible
- [x] T041 [P] Prevent default scroll behavior with `event.preventDefault()` when handling Arrow keys
- [ ] T042 Unit test: selection reducer - next/prev/topmost logic, boundary behavior (first/last article checks)
- [ ] T043 Unit test: keydown handler - event prevention, focus guard correctness, selection state updates
- [ ] T044 E2E test: First Arrow Down on unfocused timeline → top article selected with visual feedback
- [ ] T045 E2E test: Arrow Down/Up navigation through 10 articles → each deselection marks previous as read
- [ ] T046 E2E test: First article selected, Arrow Up → stays on first (no wrap, no error)
- [ ] T047 E2E test: Focus guard - click search input, press Arrow Down → no article navigation (still in search)
- [ ] T048 E2E test: Tab to timeline, type character in input while focused → arrow keys type characters, not navigate

## Phase 5: Selection Styling & Accessibility

- [x] T049 Design selection styles: distinct from read/unread (e.g., border, background, or shadow) in `src/styles/globals.css` or Tailwind
- [x] T050 [P] Apply `aria-selected="true"` to selected article element in render (or use semantic `<article>` with focus)
- [x] T051 [P] Apply `aria-label="Article: {title} by {author}"` to each article for screen reader context
- [x] T052 [P] Add focus ring styling on selected article (CSS `outline` or `focus-within` with visible color)
- [ ] T053 Validate WCAG 2.1 AA contrast for selection highlight (≥4.5:1 against background) using axe-core
- [ ] T054 Validate keyboard focus order: sidebar → folder queue → first article → next/prev via arrow keys
- [ ] T055 E2E test with axe-core: timeline view, selected article, read article → 0 critical accessibility violations
- [ ] T056 Manual test with screen reader (NVDA or JAWS): confirm aria-selected, aria-label, and focus order correct

## Phase 6: Integration & Offline Sync

- [ ] T057 [P] Ensure read mutations use existing `api.items.markRead()` endpoint (no new API)
- [ ] T058 [P] Integrate with existing offline mutation queue (IndexedDB) if present; queue reads when offline
- [ ] T059 [P] Verify read state updates sync correctly per existing sync rules (no new sync logic or conflation)
- [ ] T060 [P] Confirm articles marked read stay visible until reload (no mid-session removal)
- [ ] T061 [P] Verify next fetch after reload uses `getRead=false` (unread-only policy; reads evicted per Constitution VI)
- [ ] T062 [P] Test offline mode: mark articles read, disconnect network → mutations queued in IndexedDB
- [ ] T063 [P] Test offline + reconnect: go offline, mark read, reconnect → mutations replay successfully
- [ ] T064 E2E test: Mark 5 articles read via scroll; close DevTools Network tab; reload page → no marked articles reappear

## Phase 7: Responsive & Visual Design

- [ ] T065 Test docking at 320px breakpoint: queue docks, doesn't overlap article text, readable on small screen
- [ ] T066 Test docking at 768px breakpoint: queue sticks, sidebar visible (if two-column), timeline readable
- [ ] T067 Test docking at 1024px breakpoint: two-column layout with docking, content aligned, no shifts
- [ ] T068 Test docking at 1440px breakpoint: three-panel layout (if exists) with docking, all readable
- [ ] T069 Test keyboard nav at 320px: selection visible, scroll smooth, no overflow issues
- [ ] T070 Test keyboard nav at 768px+: selection clear, focus ring visible across breakpoints
- [ ] T071 Capture visual regression snapshots at three docking states:
  - (1) Page load: queue in natural position below heading
  - (2) After scroll down: queue docked to top
  - (3) Scroll back up: queue unsticking (in transition or back to natural)
- [ ] T072 Capture visual regression snapshots of selected article at each breakpoint (320/768/1024/1440)
- [ ] T073 Review and approve Playwright visual diffs for all snapshots (0 unexpected changes)

## Phase 8: Edge Cases & Error Handling

- [ ] T074 [P] Handle empty timeline: arrow keys and scroll observers gracefully no-op (no errors thrown)
- [ ] T075 [P] Handle single article: Arrow Up/Down at boundaries don't move or wrap (stay on single article)
- [ ] T076 [P] Handle very short articles near top: verify 100% threshold prevents premature mark-read (wait until fully crossed)
- [ ] T077 [P] Handle rapid flick scroll: debounce + batch ensures all crossed articles marked (no missed articles)
- [ ] T078 [P] Handle network latency on mark-read: UI shows optimistic read immediately; API call proceeds in background
- [ ] T079 [P] Handle API failures on mark-read: enqueue in offline queue for retry (don't lose mutation)
- [ ] T080 [P] Handle queue height changes (dynamic content): ResizeObserver triggers timeline offset update smoothly
- [ ] T081 [P] Handle rapid selection changes via keyboard: debounce mark-read to avoid mutation spam
- [ ] T082 Unit test: edge case - empty article list, single article, boundary navigation
- [ ] T083 Unit test: edge case - debounce collision (rapid key presses and scroll crosses simultaneously)
- [ ] T084 E2E test: Rapid flick scroll skips 20 articles → all marked read (capture Network tab to verify batch calls)
- [ ] T085 E2E test: Very short article (1 line) near top → not marked until fully crosses (measure scroll offset)
- [ ] T086 E2E test: Network error during mark-read → UI still optimistic; retry happens in background

## Phase 9: Quality & Testing Coverage

- [ ] T086 Conduct lightweight usability test: Have 3–5 test users scroll timeline and use keyboard nav for 5 min each; collect feedback on queue docking visibility, selection clarity, and focus handling; document results and any unexpected interactions
- [x] T087 Run full unit test suite: `npm run test` on new hooks/utils (useTimelineSelection, useFolderQueueDocking, useAutoMarkReadOnScroll, utilities)
- [x] T088 Run full E2E test suite: `npm run test:e2e` (all new test scenarios from phases 2–8)
- [x] T089 Run type check: `npm run typecheck` (no TypeScript errors or warnings)
- [x] T090 Run linting: `npm run lint:fix` (all files pass ESLint)
- [x] T091 Run formatting: `npm run format` (all files formatted per project style)
- [ ] T092 Measure test coverage: `npm run test:coverage` on new code (≥90% line coverage for hooks/utils)
- [ ] T093 Performance audit: Measure docking smooth 60fps (no jank during scroll), keyboard nav <16ms (60fps), mark-read <500ms)
- [ ] T094 Accessibility audit: Run axe-core on login, timeline, and selection states → 0 critical violations
- [ ] T095 Manual smoke test: Build static export (`npm run build`), verify docking/nav/read all work in production-like build
- [ ] T096 Review usability test feedback (T086) and address any unexpected interactions or usability issues

## Phase 10: Documentation & Cleanup

- [ ] T097 Update README.md or docs if keyboard navigation features not already documented
- [ ] T098 Add JSDoc comments to all exported hooks in `src/hooks/*.ts` (purpose, params, return type)
- [ ] T099 Add inline comments to `src/lib/timeline/selection.ts` and `src/lib/timeline/read-batching.ts` for non-obvious logic
- [ ] T100 Review and remove any `console.log()` debug statements from implementation
- [ ] T101 Remove unused imports and dead code from implementation files
- [ ] T102 Code review: ensure code style consistent with project (naming, indentation, patterns)
- [ ] T103 Create/update CHANGELOG entry for this feature

---

## Dependencies & Execution Strategy

### Independent Phases (can run in parallel after Phase 1):
- **Phase 2 (Conditional Docking)** and **Phase 3 (Auto mark-read)** are independent; both use existing timeline component and API.
- **Phase 4 (Keyboard nav)** depends on hooks from Phase 1; can start after Phase 1.
- **Phase 5 (Styling)** depends on Phase 4 (need selected element); can follow Phase 4.
- **Phase 6 (Offline sync)** depends on Phase 3 (mark-read API); can follow Phase 3.

### Sequential Critical Path:
1. **Phase 1** (setup) 
2. **Phases 2, 3, 4** (feature work in parallel)
3. **Phase 5** (styling, after Phase 4)
4. **Phase 6** (integration, after Phase 3)
5. **Phases 7, 8** (responsive, edge cases, parallel)
6. **Phase 9** (testing & quality, after all feature phases)
7. **Phase 10** (docs, final cleanup)

### MVP Scope (minimum to ship):
- **Phase 1**: Setup and types
- **Phase 2**: Conditional docking (sticky + IntersectionObserver)
- **Phase 3**: Auto mark-read (core functionality)
- **Phase 4**: Keyboard nav (core functionality)
- **Phase 5 subset**: Basic selection styling + aria-selected
- **Phase 6 subset**: Reuse existing API and mutation queue (no new infrastructure)
- **Phase 7 subset**: Test core breakpoints (768px, 1024px)
- **Phase 9 subset**: Unit tests for hooks, E2E for user stories 1 & 2, type check, lint

### Full Scope:
- All 102 tasks including edge cases, all responsive tests, accessibility audit, comprehensive docs.

---

## Success Metrics Mapping

| Success Criteria | Related Tasks | Verification Method |
|------------------|---------------|---------------------|
| **SC-001**: 95% users keep queue visible during long scrolls | T014–T016, T065–T073, T086 | E2E docking tests, visual regression, lightweight usability test (3–5 users) |
| **SC-002**: 95% articles marked read ≤0.5s, remain visible | T027–T030, T084, T085 | E2E timing logs, auto-read e2e, network tab verification |
| **SC-003**: Arrow nav through 10 articles, 100% correct, always visible | T044–T047, T069–T070 | E2E 10-article navigation, selection visibility tests |
| **SC-004**: <1% accidental read changes while typing elsewhere | T048, T086 | Focus guard e2e, input field conflict tests |

---

## Task Format Reference

All tasks follow strict checklist format:
- `- [ ] [ID] [P if parallel] [US label if applicable] Description with file path`
- **[ID]**: Unique identifier (T001–T102) in execution order
- **[P]**: Task can run in parallel (different files, no blocking dependencies)
- **[US label]**: User story mapping (e.g., [US1], [US2], [US3]) — Phase 2 = US1, Phase 3 = US1/US3, Phase 4 = US2
- **Description**: Clear action and file paths
- **File paths**: Explicit for each task where applicable

---

## Notes

- All 103 tasks are independent or explicitly dependent; no circular dependencies.
- Tests are right-sized per Constitution IV: unit for risky logic, e2e for user journeys, accessibility for WCAG compliance.
- No new runtime compute or services; all features client-side in static export.
- Offline sync and mutation queue integrated with existing infrastructure (no new systems).
- Visual regression tests capture three distinct docking states (initial, docked, unsticking) for clarity.
