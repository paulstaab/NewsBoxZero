# Tasks: Static Headless RSS Web App

**Input**: `/specs/001-static-rss-app/` design documents (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Constitution Evidence**: Every user story includes mandatory tests, UX verification, and performance checks to satisfy Principles I–V. Tasks are organized so each story remains independently implementable and testable.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js static project, tooling, and CI scaffolding required for all further work.

- [ ] T001 Bootstrap the Next.js 15 App Router project with TypeScript support and required dependencies by updating `package.json`, `tsconfig.json`, and `next.config.js`.
- [ ] T002 Create the agreed directory structure (`src/app`, `src/components`, `src/hooks`, `src/lib`, `src/styles`, `tests/`) with placeholder files so imports resolve per plan.md.
- [ ] T003 Wire TailwindCSS + PostCSS (including custom breakpoints) and seed design tokens in `tailwind.config.js`, `postcss.config.js`, and `src/styles/tokens.css`.
- [ ] T004 [P] Configure ESLint + Prettier + lint scripts (`.eslintrc.cjs`, `.prettierrc`, `package.json scripts`) to enforce Principle I gates.
- [ ] T005 [P] Add Vitest + Playwright + axe-core tooling by creating `vitest.config.ts`, `playwright.config.ts`, and `tests/setup.ts` per quickstart.md.
- [ ] T006 [P] Author CI workflows for lint/test/build/Lighthouse in `.github/workflows/ci.yml` ensuring `npm run build && npm run export` executes on every PR.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core architecture (types, API client, storage, styling, mocks) needed by every user story.

- [ ] T007 Translate the entities from `data-model.md` into `src/types/session.ts`, `src/types/feed.ts`, `src/types/folder.ts`, `src/types/article.ts`, and `src/types/mutation.ts` with exported barrel `src/types/index.ts`.
- [ ] T008 [P] Implement credential storage + preference helpers per research.md in `src/lib/storage.ts` (session vs. local storage, validation, clearing).
- [ ] T009 Build the authenticated fetch wrapper with HTTPS enforcement, Basic auth header injection, and error normalization in `src/lib/api/client.ts` (uses contracts/auth.md).
- [ ] T010 [P] Create typed domain modules `src/lib/api/feeds.ts`, `src/lib/api/items.ts`, and `src/lib/api/folders.ts` that wrap the v1.3 endpoints documented in contracts/.
- [ ] T011 [P] Configure global SWR settings and provider component in `src/lib/swr/config.tsx`, then consume it from `src/app/layout.tsx` to enable caching everywhere.
- [ ] T012 [P] Establish global styles + layout shell (`src/app/layout.tsx`, `src/styles/globals.css`) including font loading, color scheme, and base grid per Experience standards.
- [ ] T013 [P] Set up MSW mocks & handlers for `/feeds`, `/items`, `/folders`, `/version` in `tests/mocks/handlers.ts`, `tests/mocks/browser.ts`, and hook them in `tests/setup.ts`.
- [ ] T014 [P] Add a minimal service worker (`public/sw.js`) and offline indicator component (`src/components/ui/OfflineBanner.tsx`) that toggles on `navigator.onLine` events.

**Checkpoint**: Foundation ready—user stories can now be developed/testing in parallel.

---

## Phase 3: User Story 1 – View Aggregated Timeline (Priority: P1) 🎯 MVP

**Goal**: Allow users to log in, validate credentials, and view an aggregated unread timeline with infinite scroll and read/unread toggle.

**Independent Test**: From a static export, complete the login wizard with valid credentials, fetch `/feeds` + `/items` (type=3, getRead=false), and confirm the latest batch renders with unread markers and an "All caught up" empty state when appropriate.

### Tests (write first, expect to fail)

- [ ] T015 [P] [US1] Author Vitest contract tests covering default `/items` + `/feeds` fetch params in `tests/unit/lib/items.fetcher.test.ts` using MSW to assert query strings.
- [ ] T016 [P] [US1] Create Playwright E2E `tests/e2e/us1-login-timeline.spec.ts` that walks the login wizard, toggles Unread/All, and verifies infinite scroll requests (failing before implementation).

### Experience & Performance Checks

- [ ] T017 [P] [US1] Capture responsive visual snapshots (320/768/1024/1440px) for login + timeline flows in `tests/visual/us1-login-timeline.spec.ts` and store baselines.
- [ ] T018 [US1] Record Lighthouse + bundle metrics for the MVP timeline in `docs/metrics/us1-timeline.md` (run `npm run build && npx lhci autorun`).
- [ ] T019 [US1] Validate `npm run build && npm run export` output and document asset sizes + static checks in `docs/releases/us1-export.md`.

### Implementation

- [ ] T020 [P] [US1] Build the multi-step login wizard UI with validation + remember-device toggle in `src/app/login/page.tsx` per FR-001.
- [ ] T021 [P] [US1] Implement the `useAuth` hook + context in `src/hooks/useAuth.tsx`, invoking `/index.php/apps/news/api/v1-3/feeds` for credential validation and persisting via `storage.ts`.
- [ ] T022 [P] [US1] Create SWR hooks `src/hooks/useFeeds.ts` and `src/hooks/useItems.ts` that request default parameters and expose pagination helpers.
- [ ] T023 [P] [US1] Implement timeline UI primitives (ArticleCard, TimelineList, EmptyState, Toggle) in `src/components/timeline/*` with lazy-loaded article bodies.
- [ ] T024 [US1] Assemble the aggregated timeline route in `src/app/timeline/page.tsx` with Unread/All toggle, infinite scroll (offset pagination), and empty-state messaging.
- [ ] T025 [US1] Add skeleton/load/error + offline handling around login/timeline flows using `src/components/ui/AsyncBoundary.tsx` and integrate with `OfflineBanner`.

**Checkpoint**: US1 independently delivers a working static MVP.

---

## Phase 4: User Story 2 – Organize & Update Read State (Priority: P2)

**Goal**: Let users navigate folders/feeds, filter timelines, and sync read/star state (single + bulk) with optimistic UI and unread counters.

**Independent Test**: Using an account with multiple folders, switch filters, mark items read/unread/star, and verify API calls (`/items/{id}/read`, `/items/star/multiple`, `/feeds/{id}/read`) plus real-time unread badges without reloads.

### Tests (write first)

- [ ] T026 [P] [US2] Add Vitest coverage for the read-state mutation queue + filter helpers in `tests/unit/hooks/useMutations.test.ts` referencing `ReadStateMutation` data model.
- [ ] T027 [P] [US2] Extend Playwright suite with `tests/e2e/us2-organize-readstate.spec.ts` to exercise folder filtering, mark-as-read, and bulk star actions end-to-end.

### Experience & Performance Checks

- [ ] T028 [P] [US2] Refresh responsive/visual baselines for sidebar navigation + mutation toasts in `tests/visual/us2-sidebar-actions.spec.ts` and confirm focus order.
- [ ] T029 [US2] Log Lighthouse/bundle metrics focused on read-state changes in `docs/metrics/us2-sync.md` (ensure budgets stay within Principle V).
- [ ] T030 [US2] Capture export verification + asset diffs after read-state features in `docs/releases/us2-export.md`.

### Implementation

- [ ] T031 [P] [US2] Build sidebar navigation components (FolderTree, FeedList, unread badges) in `src/components/sidebar/*` consuming SWR data.
- [ ] T032 [P] [US2] Implement filter + view state management in `src/hooks/useTimelineFilters.ts`, syncing with URL/search params per FR-004.
- [ ] T033 [P] [US2] Implement the optimistic read-state queue (enqueue, retry, rollback) in `src/lib/mutations/readStateQueue.ts` per data-model.md.
- [ ] T034 [P] [US2] Wire mark read/unread/star API calls + bulk payload builders in `src/lib/api/items.ts` and expose UI batch controls in `src/components/timeline/ActionBar.tsx`.
- [ ] T035 [US2] Update `src/app/timeline/page.tsx` to react to folder/feed filters, display counter chips, and refresh SWR caches after mutations.
- [ ] T036 [US2] Add user feedback (toasts, inline errors) for mutation success/failure in `src/components/timeline/BulkActionToast.tsx`.

**Checkpoint**: US1 + US2 both function independently with synchronized read state.

---

## Phase 5: User Story 3 – Manage Subscriptions (Priority: P3)

**Goal**: Enable feed/folder CRUD (add, rename, move, delete) and diagnostics without leaving Feedfront.

**Independent Test**: Add a feed, move it between folders, rename/delete folders via the UI, and confirm API calls (`/feeds`, `/feeds/{id}/move`, `/folders/{id}`) plus immediate sidebar/timeline updates.

### Tests (write first)

- [ ] T037 [P] [US3] Add Vitest contract tests for feed/folder CRUD wrappers in `tests/unit/lib/subscriptions.test.ts` using MSW fixtures from contracts/feeds.md and folders.md.
- [ ] T038 [P] [US3] Create Playwright scenario `tests/e2e/us3-manage-subscriptions.spec.ts` covering add/move/delete flows and optimistic updates.

### Experience & Performance Checks

- [ ] T039 [P] [US3] Capture visual baselines for subscription modals/drawers across breakpoints in `tests/visual/us3-subscriptions.spec.ts` ensuring WCAG focus order.
- [ ] T040 [US3] Append Lighthouse + bundle measurements for subscription-heavy pages in `docs/metrics/us3-subscriptions.md`.
- [ ] T041 [US3] Re-run static export + asset audit documenting results in `docs/releases/us3-export.md`.

### Implementation

- [ ] T042 [P] [US3] Implement subscription modals/drawers (`AddFeedModal.tsx`, `RenameFolderDrawer.tsx`, `DeleteConfirmDialog.tsx`) under `src/components/subscription/` with form validation.
- [ ] T043 [P] [US3] Flesh out feed/folder CRUD helpers in `src/lib/api/feeds.ts` and `src/lib/api/folders.ts`, including cascading safeguards and error mapping.
- [ ] T044 [P] [US3] Add move/drag-and-drop UI for feeds between folders inside `src/components/sidebar/FeedList.tsx` (keyboard-accessible ordering).
- [ ] T045 [US3] Introduce a `useSubscriptions` hook in `src/hooks/useSubscriptions.ts` to orchestrate CRUD mutations + SWR cache invalidation.
- [ ] T046 [US3] Implement the diagnostics/debug drawer (FR-011) in `src/components/debug/DiagnosticsDrawer.tsx` showing host, sync time, and Lighthouse metrics.

**Checkpoint**: All three stories complete; subscriptions manageable within the static app.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, accessibility, and release-readiness tasks across stories.

- [ ] T047 [P] Refresh `specs/001-static-rss-app/quickstart.md` with final login, testing, and deployment steps validated against the implemented UI.
- [ ] T048 [P] Run axe-core + keyboard accessibility sweeps across all routes and archive reports in `docs/a11y/axe-report.md` per Constitution Principle IV.
- [ ] T049 Execute full pipeline validation (`npm run lint && npm run test && npm run build && npm run export`) and document release notes in `docs/releases/summary.md`.

---

## Dependencies & Execution Order

1. **Phase 1 → Phase 2**: Setup must complete before foundational work (tooling and configs required for everything else).
2. **Phase 2 → User Stories**: All user stories depend on shared types, API client, SWR provider, and mocks from Phase 2.
3. **User Story Sequencing**: US1 is MVP and unlocks login/timeline; US2 and US3 can start once Phase 2 completes but should respect data dependencies (US2 builds on timeline, US3 on sidebar infrastructure).
4. **Polish**: Runs after desired user stories ship to consolidate docs, accessibility, and release validation.

---

## Parallel Execution Examples

- **Within Phase 2**: After T007, tasks T008–T014 touch separate files (storage, API client, SWR, styles, mocks, service worker) and can be split among developers.
- **US1 Tests**: T015 and T016 are independent (unit vs. E2E) and can be authored concurrently before implementation.
- **US2 Implementation**: T031 (sidebar UI) and T033 (mutation queue) can progress in parallel, converging at T035 when integrating filters and optimistic updates.
- **US3 Implementation**: T042 (modals) and T044 (drag-and-drop) target different components and may proceed simultaneously once API helpers (T043) exist.

---

## Implementation Strategy

1. **MVP First**: Complete Phases 1–2, then deliver US1 end-to-end (login + timeline). This produces a demo-ready static build satisfying core value.
2. **Incremental Delivery**: After US1, layer US2 (organization/read state) and US3 (subscriptions) sequentially, ensuring each story passes its tests/UX/perf gates before merging.
3. **Parallel Teams**: With multiple developers, finish Phase 2 together, then split stories (e.g., one engineer owns US1 final touches while others start US2/US3) to accelerate delivery without violating independence.
4. **Evidence First**: For every story, land tests (Vitest + Playwright) before implementation, then capture visual/performance evidence prior to closing the story.

---
