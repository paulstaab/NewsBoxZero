# Tasks: Folder-Based Timeline View

**Input**: Design documents from `/specs/003-timeline-folder-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

Purpose: Ensure configuration, fixtures, and test scaffolding are ready before feature work begins.

- [X] T001 [P] Add timeline cache/performance config constants to src/lib/config/env.ts so subsequent code can reference stable keys.
- [X] T002 [P] Seed folder + unread article fixtures in tests/mocks/handlers.ts and tests/mocks/server.ts to power local development and tests.
- [X] T003 [P] Scaffold Playwright flow in tests/e2e/timeline-folders.spec.ts capturing login + timeline smoke steps (initially skipped) to drive TDD.

---

## Phase 2: Foundational (Blocking Prerequisites)

Purpose: Core state, types, and hooks that every user story depends on. **All later phases depend on this phase.**

- [X] T004 Implement timeline cache helpers in src/lib/storage/timelineCache.ts (load/store/prune) and export from src/lib/storage.ts.
- [X] T005 [P] Extend folder/article interfaces in src/types/folder.ts, src/types/article.ts, and src/types/index.ts with TimelineCacheEnvelope, FolderQueueEntry, and ArticlePreview types.
- [X] T006 [P] Build folder sorting + unread aggregation utilities in src/lib/utils/unreadAggregator.ts per data-model.md rules (caps, tie-breakers, pruning).
- [X] T007 Create src/hooks/useFolderQueue.ts that wraps useItems, exposes folder queue state, and plugs into storage/timeline cache (no UI yet).
- [X] T008 [P] Add Vitest coverage for cache + aggregation reducers in tests/unit/lib/timelineCache.test.ts and tests/unit/lib/unreadAggregator.test.ts.

---

## Phase 3: User Story 1 – View Unread Articles by Folder (Priority: P1) 🎯 MVP

**Goal**: Display only the highest-priority folder’s unread articles, sorted newest first, with folder context.

**Independent Test**: Load timeline with seeded folders; verify highest unread count folder renders first, only its articles appear, and empty state shows when none remain.

### Tests & Checks (Right-Sized)

- [X] T009 [P] [US1] Add Vitest cases in tests/unit/hooks/useFolderQueue.test.ts validating initial folder ordering + single-folder selection.
- [X] T010 [P] [US1] Enable Playwright assertions in tests/e2e/timeline-folders.spec.ts for default folder ordering and empty-state messaging.

### Implementation

- [X] T011 [US1] Wire src/hooks/useFolderQueue.ts to hydrate from localStorage, derive FolderProgressState, and emit active folder articles.
- [X] T012 [US1] Create src/components/timeline/FolderStepper.tsx to render folder title, unread count, and navigation context above the list.
- [X] T013 [US1] Update src/components/timeline/TimelineList.tsx to accept folder-scoped articles and show folder-specific empty/loader states.
- [X] T014 [US1] Update src/app/timeline/page.tsx to consume useFolderQueue, remove global infinite scroll, and show all-read message when queue empty.
- [X] T015 [US1] Enhance src/components/timeline/UnreadSummary.tsx to display counts for the active folder and total remaining folders.

---

## Phase 4: User Story 2 – Mark Folder as Read and Progress (Priority: P1)

**Goal**: Allow the user to mark all visible articles as read and automatically advance to the next folder.

**Independent Test**: From the first folder, click "Mark All as Read"; assert items disappear, next folder loads, and API call succeeds (mocked via MSW).

### Tests & Checks (Right-Sized)

- [X] T016 [P] [US2] Extend tests/unit/hooks/useFolderQueue.test.ts with markFolderRead reducer coverage (pendingReadIds + queue advance).
- [X] T017 [P] [US2] Add Playwright step in tests/e2e/timeline-folders.spec.ts verifying mark-all triggers API call and surfaces next folder.

### Implementation

- [X] T018 [US2] Implement markFolderRead action in src/hooks/useFolderQueue.ts, calling markItemsRead from src/lib/api/items.ts and updating cache.
- [X] T019 [US2] Render Mark All as Read button + loading/disabled states within src/components/timeline/FolderStepper.tsx.
- [X] T020 [US2] Update src/lib/utils/unreadAggregator.ts and src/lib/storage/timelineCache.ts to drop read articles and recompute folder ordering post-mark.
- [X] T021 [US2] Ensure src/app/timeline/page.tsx shows "All articles read" messaging immediately after final folder completion.

---

## Phase 5: User Story 5 – Update and Persist Unread Status (Priority: P1)

**Goal**: Persist unread queues across sessions and merge fresh items on load or manual update without losing unfinished folders.

**Independent Test**: Reload the page after marking/skip actions; state should persist. Click Update; new mock articles append while existing unread ones remain.

### Tests & Checks (Right-Sized)

- [X] T022 [P] [US5] Add Vitest cases in tests/unit/lib/timelineCache.test.ts for mergeItemsIntoCache, pendingReadIds tombstones, and exponential retry metadata.
- [X] T023 [P] [US5] Extend Playwright spec to cover automatic update on load and manual Update button behavior (loading indicator + merged results).

### Implementation

- [X] T024 [US5] Implement cache merge + pendingRead/pendingSkip handling in src/lib/storage/timelineCache.ts per research.md strategy.
- [X] T025 [US5] Add automatic update-on-mount + manual refresh wiring in src/app/timeline/page.tsx (call useFolderQueue refresh + SWR revalidate).
- [X] T026 [US5] Instrument performance marks and metrics logging in src/lib/metrics/metricsClient.ts and invoke from timeline page after cache render/update complete.
- [X] T027 [US5] Build offline retry/backoff logic within src/hooks/useFolderQueue.ts (1 s → 2 s → 4 s) and surface toast errors when updates fail.

---

## Phase 6: User Story 3 – Skip to Next Folder (Priority: P2)

**Goal**: Let users skip a folder without marking it read, keeping unread articles intact but advancing the session, plus restart messaging when all folders viewed.

**Independent Test**: Click Skip on successive folders until the end; "all folders viewed" message appears with restart button; skipped folders reappear after restart.

### Tests & Checks (Right-Sized)

- [ ] T028 [P] [US3] Add Vitest coverage in tests/unit/hooks/useFolderQueue.test.ts for skipFolder transitions, queue reordering, and restart behavior.
- [ ] T029 [P] [US3] Expand Playwright spec to exercise Skip button, verify skipped folder remains unread, and confirm restart CTA resets queue.

### Implementation

- [ ] T030 [US3] Implement skipFolder + restart actions in src/hooks/useFolderQueue.ts updating pendingSkipFolderIds and folder statuses.
- [ ] T031 [US3] Render Skip + Restart buttons and "all folders viewed" message in src/components/timeline/FolderStepper.tsx and src/components/timeline/EmptyState.tsx.

---

## Phase 7: User Story 4 – View Article Details (Priority: P2)

**Goal**: Show title/summary/thumbnail for each article, open original via title link, and reveal full text inline on card expansion while marking it read.

**Independent Test**: Expand an article; full text renders inline, the article disappears from unread counts, and clicking the title opens a new tab.

### Tests & Checks (Right-Sized)

- [ ] T032 [P] [US4] Add Vitest tests in tests/unit/components/timeline/ArticleCard.test.tsx verifying expand-to-read behavior and missing data fallbacks.
- [ ] T033 [P] [US4] Extend Playwright spec to validate inline expansion, external link behavior, and thumbnail/summary visibility.

### Implementation

- [ ] T034 [US4] Update src/components/timeline/ArticleCard.tsx to render title link, summary, thumbnail, inline body (when available), and trigger markItemRead on expand.
- [ ] T035 [US4] Add graceful fallbacks for missing title/summary/thumbnail + keyboard accessibility cues in src/components/timeline/ArticleCard.tsx and related CSS modules (if any).

---

## Phase 8: Polish & Cross-Cutting Concerns

Purpose: Final documentation, visual regression, and quality gates spanning all stories.

- [ ] T036 [P] Refresh docs/quickstart entries in specs/003-timeline-folder-view/quickstart.md and README.md with final workflow + troubleshooting notes.
- [ ] T037 [P] Capture new Playwright visual baselines (tests/visual/timeline-folders.spec.ts) for folder header, mark-read, skip, update, and all-read states.
- [ ] T038 Run `npm run lint && npm run test && npx playwright test tests/e2e/timeline-folders.spec.ts` to ensure lint/type/unit/e2e suites pass before release.

---

## Dependencies & Execution Order

1. **Phase 1 → Phase 2**: Setup provides config + fixtures required by foundational cache work.
2. **Phase 2 → Phases 3–7**: All user stories depend on cache/types/hooks from Phase 2.
3. **User Story Priority Order**: US1 (P1) → US2 (P1) → US5 (P1) → US3 (P2) → US4 (P2). Each story can start only after predecessors complete unless team capacity allows parallel execution with strict coordination on shared files.
4. **Phase 8** runs after every targeted user story is feature-complete.

## Parallel Execution Examples

- **US1**: T009 (Vitest) and T010 (Playwright) can run in parallel while T011–T015 proceed sequentially.
- **US2**: T016 and T017 (tests) may run alongside implementation task T018 because they rely on MSW mocks.
- **US5**: T022 (unit tests) and T023 (Playwright) can start while T024–T027 build cache merge + update wiring, provided mock data exists.
- **US3**: T028 (unit) and T029 (Playwright) can execute once skip actions are stubbed, independent from UI polish.
- **US4**: T032 and T033 operate in parallel; ArticleCard updates (T034–T035) only gate their final assertions.

## Implementation Strategy

1. **MVP First**: Deliver US1 entirely (Phases 1–3) to ship a usable folder-first timeline. This satisfies the MVP requirement.
2. **Incremental Enhancements**: Layer US2 (mark read) and US5 (updates/persistence) to stabilize the workflow before adding optional P2 stories.
3. **Parallel Tracks**: After Foundational work, different contributors can tackle separate user stories (e.g., one on US2, another on US5) as long as they coordinate on shared files like src/hooks/useFolderQueue.ts.
4. **Quality Gates**: Keep Vitest + Playwright coverage in lockstep with each story, honoring the Right-Sized Tests mandate, then finish with Phase 8 polish before merging.
