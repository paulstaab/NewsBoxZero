# Tasks: Static Headless RSS Web App

**Input**: `/specs/001-static-rss-app/` design documents (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Constitution Evidence**: Every user story carries test, UX, and performance tasks so Principle I–V gates stay enforceable. Tasks follow the mandated checklist format with explicit file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the Next.js 14 static workspace, tooling, and CI scaffolding required by all later phases.

- [x] T001 Configure Node 20 + Next.js 14 static export defaults (output: 'export', trailingSlash, images.unoptimized) in `package.json`, `tsconfig.json`, and `next.config.js`.
- [x] T002 Create the directory skeleton (`src/app`, `src/components`, `src/hooks`, `src/lib`, `src/styles`, `src/types`, `tests/`, `public/`) with placeholder exports in `src/app/page.tsx` and `src/app/layout.tsx` so imports resolve per plan.md.
- [x] T003 Install Tailwind+PostCSS and seed responsive tokens/breakpoints in `tailwind.config.js`, `postcss.config.js`, `src/styles/tokens.css`, and `src/styles/globals.css`.
- [x] T004 [P] Configure ESLint (strict TS rules), Prettier, and npm scripts in `.eslintrc.cjs`, `.prettierrc`, and `package.json` to satisfy Constitution Principle I.
- [x] T005 [P] Wire Vitest, Playwright, MSW, axe-core, and coverage gates via `vitest.config.ts`, `playwright.config.ts`, and `tests/setup.ts` with scripts in `package.json`.
- [x] T006 [P] Author end-to-end CI (lint → test → typecheck → build → export) inside `.github/workflows/ci.yml` including artifact uploads for `/out`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared architecture—types, storage, API client, SWR provider, offline shell, and mocks—that every story depends on.

- [X] T007 Translate entities from `data-model.md` into `src/types/session.ts`, `src/types/feed.ts`, `src/types/folder.ts`, `src/types/article.ts`, and `src/types/mutation.ts`, then export them via `src/types/index.ts`.
- [X] T008 [P] Implement runtime/env guards enforcing HTTPS hosts and feature flags in `src/lib/config/env.ts`, surfacing actionable copy for invalid URLs (FR-002).
- [X] T009 [P] Build credential + preference storage helpers (session vs. local, remember-device, clear) in `src/lib/storage.ts` per research.md requirements.
- [X] T010 [P] Create the authenticated fetch client with Basic auth header injection, custom User-Agent, exponential backoff, and error mapping in `src/lib/api/client.ts`.
- [X] T011 [P] Add typed domain wrappers for feeds/items/folders in `src/lib/api/feeds.ts`, `src/lib/api/items.ts`, and `src/lib/api/folders.ts` aligned with contracts/.
- [X] T012 [P] Implement client-side unread aggregation utilities for feeds/folders in `src/lib/utils/unreadAggregator.ts` consuming `/items` responses (FR-005).
- [X] T013 [P] Configure global SWR provider with dedupe intervals, offline gating, a 5-minute in-memory cache TTL per FR-003, and revalidation knobs in `src/lib/swr/provider.tsx`, then compose it in `src/app/layout.tsx`.
- [X] T014 [P] Build async boundary, error formatter, and retry hooks in `src/components/ui/AsyncBoundary.tsx` and `src/lib/utils/errorFormatter.ts` to satisfy FR-012.
- [X] T015 [P] Set up MSW mocks + fixtures for `/feeds`, `/items`, `/folders`, `/version`, `/items/*` in `tests/mocks/handlers.ts`, `tests/mocks/server.ts`, and `tests/setup.ts`.
- [X] T016 [P] Ship the offline shell: register a minimal service worker in `public/sw.js` and surface status via `src/components/ui/OfflineBanner.tsx` (network-less mode requirement).
- [X] T017 [P] Compose the global layout shell (`src/app/layout.tsx`) with typography, color tokens, skeleton slots, and skip-link/performance hooks referenced in plan.md.
- [X] T018 [P] Add instrumentation + last-sync tracking utilities in `src/lib/metrics/metricsClient.ts` feeding diagnostics, logging budgets, and emitting real-user monitoring events required by SC-001 and SC-002.

**Checkpoint**: Foundation complete—user stories can run independently atop the shared stack.

---

## Phase 3: User Story 1 – View Aggregated Timeline (Priority: P1) 🎯 MVP

**Goal**: Let users authenticate, validate credentials, and skim an aggregated unread timeline with pagination, unread/all toggle, lazy media, and backoff-aware errors.

**Independent Test**: From a static export, complete the login wizard, fetch `/feeds` + `/items` (type=3, batchSize=50, getRead=false), and verify unread counts + empty states render without server help.

### Tests (write first)

- [X] T019 [P] [US1] Write Vitest specs for login validation and session persistence in `tests/unit/hooks/useAuth.test.ts`, covering remember-device gating and HTTPS enforcement.
- [X] T020 [P] [US1] Add Vitest coverage for `/items` fetch defaults, client-side unread aggregation, and exponential backoff in `tests/unit/lib/items.fetcher.test.ts` using MSW fixtures.
- [X] T021 [P] [US1] Create Playwright flow `tests/e2e/us1-login-timeline.spec.ts` that exercises login, Unread↔All toggle, infinite scroll, and offline indicator behavior (fails pre-impl).

### Experience & Performance Checks

- [X] T022 [P] [US1] Capture responsive snapshots for onboarding + timeline (320/768/1024/1440px) in `tests/visual/us1-login-timeline.spec.ts` and baseline the layouts.
- [X] T023 [US1] Document bundle metrics for the MVP timeline in `docs/metrics/bundle.md` after `npm run build`.
- [X] T024 [US1] Record static export evidence (asset sizes, HTML count) in `docs/releases/us1-export.md` after `npm run build && npm run export`.

### Implementation

- [X] T025 [P] [US1] Implement the multi-step login wizard with URL/credential validation, handshake progress, and remember-device toggle in `src/app/login/page.tsx` (FR-001).
- [X] T026 [P] [US1] Build the `useAuth` context + provider in `src/hooks/useAuth.tsx` that pings `/feeds` for validation, encodes Basic auth, and stores credentials only after success.
- [X] T027 [P] [US1] Create timeline data hooks (`src/hooks/useItems.ts`, `src/lib/utils/prefetchManager.ts`) handling batch fetch, infinite scroll offsets, 75% prefetch, and offline short-circuiting.
- [X] T028 [P] [US1] Develop timeline primitives in `src/components/timeline/ArticleCard.tsx`, `src/components/timeline/TimelineList.tsx`, and `src/components/timeline/EmptyState.tsx` with lazy-loaded body content and collapsed large enclosures.
- [X] T029 [P] [US1] Render aggregate unread summaries + badges using `src/components/timeline/UnreadSummary.tsx`, wiring `unreadAggregator` outputs to the UI.
- [X] T030 [US1] Compose the timeline route in `src/app/timeline/page.tsx`, wiring Unread/All toggle, infinite scroll, empty state, and offline-friendly guardrails.
- [X] T031 [US1] Surface exponential backoff + retry affordances via `src/components/ui/RequestStateToast.tsx`, ensuring FR-012 copy appears during throttling.

**Checkpoint**: US1 delivers a static MVP—login plus aggregated timeline with evidence captured.

---

## Phase 3b: Enhanced Connection Validation (FR-001 Refinement)

**Goal**: Add pre-credential connectivity check using the `/version` endpoint to validate server reachability before asking for username/password, improving the login wizard UX per FR-001.

**Independent Test**: From login wizard, enter only a base URL, verify the client calls `/index.php/apps/news/api/v1-3/version` (no auth required), and provides feedback on connectivity before showing credential fields.

### Tests (write first)

- [X] T031b [P] [US1] Add Vitest specs for version endpoint connectivity check in `tests/unit/lib/api/version.test.ts`, covering network timeouts, invalid URLs, and successful version responses.
- [X] T031c [P] [US1] Extend Playwright login flow in `tests/e2e/us1-login-timeline.spec.ts` to validate URL-first validation step, including error states for unreachable servers.

### Implementation

- [X] T031d [P] [US1] Create version API wrapper in `src/lib/api/version.ts` that calls `GET /index.php/apps/news/api/v1-3/version` without authentication headers and returns version info or connectivity error.
- [X] T031e [US1] Update login wizard in `src/app/login/page.tsx` to add a URL validation step that calls the version endpoint before enabling the credential input fields, showing spinner/success/error states.
- [X] T031f [P] [US1] Add MSW handler for `/version` endpoint in `tests/mocks/handlers.ts` returning mock version data for test scenarios.

**Checkpoint**: Login wizard validates server connectivity before credentials, improving error messaging per FR-001.

---

## Phase 5: User Story 2 – Organize & Update Read State (Priority: P2)

**Goal**: Provide folder/feed navigation, filtering, view preferences, unread counters, and optimistic read/star mutations (single + bulk, including mark-all) synchronized with Nextcloud.

**Independent Test**: With a multi-folder account, switch folder filters, mark items read/unread/star (including bulk), and confirm `/items/*` + `/feeds/{id}/read` calls succeed while unread badges update instantly.

### Tests (write first)

- [ ] T032 [P] [US2] Add Vitest coverage for the read-state mutation queue, throttle logic, and preference persistence in `tests/unit/lib/readStateQueue.test.ts`.
- [ ] T033 [P] [US2] Extend Playwright coverage via `tests/e2e/us2-organize-readstate.spec.ts` to verify folder switching, bulk actions, and optimistic rollback UX.

### Experience & Performance Checks

- [ ] T034 [P] [US2] Refresh responsive/visual baselines for sidebar virtualization, counters, and bulk action bars in `tests/visual/us2-sidebar.spec.ts`.
- [ ] T035 [US2] Record bundle metrics focused on read-state interactions in `docs/metrics/us2-readstate.md`.
- [ ] T036 [US2] Log export verification results (bundle diffs, static size) after US2 in `docs/releases/us2-export.md`.

### Implementation

- [ ] T037 [P] [US2] Build virtualized folder/feed navigation with unread badges and 1k+ entry support in `src/components/sidebar/FolderTree.tsx` and `src/components/sidebar/FeedList.tsx`.
- [ ] T038 [P] [US2] Implement filter + view state synchronization (type/id/getRead/oldestFirst) in `src/hooks/useTimelineFilters.ts`, binding to search params per FR-004.
- [ ] T039 [P] [US2] Implement the optimistic mutation queue with retry/backoff + rollback metadata in `src/lib/mutations/readStateQueue.ts` using `ReadStateMutation`.
- [ ] T040 [P] [US2] Wire single + bulk item actions (`/items/{id}/read`, `/items/star/multiple`, `/items/unread/multiple`) in `src/lib/api/items.ts` and expose controls via `src/components/timeline/ActionBar.tsx`.
- [ ] T041 [P] [US2] Support mark-feed/folder-read endpoints (`/feeds/{id}/read`, `/folders/{id}/read`) with optimistic counters in `src/lib/api/feeds.ts` and `src/lib/api/folders.ts` (FR-007).
- [ ] T042 [P] [US2] Persist timeline view/sort preferences and remember toggles in `src/hooks/usePreferences.ts`, storing lightweight settings per FR-010.
- [ ] T043 [US2] Integrate filters, preferences, and mutation queue into `src/app/timeline/page.tsx`, including 30s throttled refreshes and SWR cache invalidation when filters change.
- [ ] T044 [US2] Provide user feedback (toasts, inline errors, retry CTA) for mutation states via `src/components/ui/MutationToast.tsx` to keep FR-012 actionable copy consistent.

**Checkpoint**: US1 + US2 independently deliver timeline + organization flows with synchronized read state.

---

## Phase 6: User Story 3 – Manage Subscriptions (Priority: P3)

**Goal**: Allow users to add/move/rename/delete feeds and folders, enforce cascade rules, and surface diagnostics data without leaving the static UI.

**Independent Test**: Perform each CRUD action through the UI, observe `/feeds` + `/folders` mutations succeed, and watch sidebar/timeline reflect changes instantly while diagnostics show current host and sync stats.

### Tests (write first)

- [ ] T045 [P] [US3] Write Vitest specs for feed/folder CRUD helpers (POST/PUT/DELETE/move) in `tests/unit/lib/subscriptions.test.ts` referencing contracts/feeds.md and folders.md.
- [ ] T046 [P] [US3] Create Playwright E2E `tests/e2e/us3-manage-subscriptions.spec.ts` covering add, rename, move, delete, and cascade protection flows.

### Experience & Performance Checks

- [ ] T047 [P] [US3] Capture visual baselines for subscription modals/drawers and drag/drop interactions in `tests/visual/us3-subscriptions.spec.ts`.
- [ ] T048 [US3] Document bundle metrics post-subscription work in `docs/metrics/us3-subscriptions.md`.
- [ ] T049 [US3] Log export verification + asset diffs for the final story in `docs/releases/us3-export.md`.

### Implementation

- [ ] T050 [P] [US3] Build feed CRUD surfaces (`AddFeedModal.tsx`, `DeleteFeedDialog.tsx`) under `src/components/subscription/` with validation + success messaging.
- [ ] T051 [P] [US3] Implement folder CRUD UI (`FolderForm.tsx`, `RenameFolderDrawer.tsx`) within `src/components/subscription/` enforcing cascading safeguards (FR-009).
- [ ] T052 [P] [US3] Extend API helpers in `src/lib/api/feeds.ts` and `src/lib/api/folders.ts` to cover POST/move/rename/delete endpoints with consistent error mapping (FR-008/FR-009).
- [ ] T053 [P] [US3] Add drag-and-drop or keyboard move controls for feeds between folders in `src/components/sidebar/FeedList.tsx`, updating ordering + pinned state.
- [ ] T054 [P] [US3] Introduce `useSubscriptions` orchestration in `src/hooks/useSubscriptions.ts` to sequence CRUD mutations, invalidate SWR caches, and refresh unread counts.
- [ ] T055 [US3] Implement diagnostics/debug drawer meeting FR-011 in `src/components/debug/DiagnosticsDrawer.tsx`, showing API host, last sync, bundle metrics.
- [ ] T056 [US3] Provide destructive-action confirmations + cascade warnings via `src/components/subscription/DeleteConfirmDialog.tsx`, halting deletes if feeds remain.

**Checkpoint**: Subscription management works end-to-end; diagnostics available for operations teams.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, accessibility, performance, and release readiness applied across the feature.

- [ ] T057 [P] Refresh `specs/001-static-rss-app/quickstart.md` with accurate setup, login, MSW, and testing instructions verified against the implemented UI.
- [ ] T058 [P] Run full axe-core + keyboard accessibility sweeps across login, timeline, sidebar, and subscription flows, saving evidence in `docs/a11y/axe-report.md`.
- [ ] T059 Execute pipeline validation (`npm run lint && npm run test && npm run build && npm run export && npx lhci autorun`) and archive release notes in `docs/releases/summary.md`.

---

## Dependencies & Execution Order

- **Graph**: `Setup (Phase 1) → Foundational (Phase 2) → US1 (Phase 3) → Version Check (Phase 3b) → {US2 (Phase 5), US3 (Phase 6)} → Polish (Phase 7)`
- Phase 1 is prerequisite for tooling, enabling Phase 2 to build shared libs.
- Phase 2 delivers API client, storage, SWR, offline shell, and mocks that every story consumes; no user story work may start before T007–T018 complete.
- US1 (Phase 3) is the MVP slice; Phase 3b enhances login wizard validation and can be done immediately after Phase 3 or in parallel.
- US2 (Phase 5) relies on US1's timeline scaffolding for filters, and US3 (Phase 6) depends on the sidebar components + SWR cache behavior established earlier.
- Polish (Phase 7) runs only after all desired user stories land so evidence, accessibility, and release notes reflect the final state.

---

## Parallel Execution Examples

- **US1**: T019 (unit tests) and T021 (E2E) can run concurrently; while tests bake, T027 (data hooks) and T028 (timeline UI) progress in parallel before converging in T030.
- **US2**: T037 (virtualized sidebar) and T039 (mutation queue) are independent; once done, T043 integrates them into the timeline while T044 handles UX feedback separately.
- **US3**: T050 (feed modals) and T053 (drag-and-drop) touch different components; T052 (API helpers) should finish first, after which both UI tasks can proceed simultaneously.

---

## Implementation Strategy

1. **MVP First**: Complete Phases 1–2, then deliver US1 end-to-end (login wizard + aggregated timeline) to unlock demos and early feedback.
2. **Incremental Delivery**: Layer US2 (organization/read state) and US3 (subscriptions/diagnostics) sequentially, validating each with its dedicated tests, visual baselines before merging.
3. **Parallel Staffing**: After Phase 2, one squad can own US1 polish while others start US2/US3 tasks marked [P], minimizing blocking work.
4. **Evidence-Driven**: Maintain the pattern of writing tests before implementation, capturing visual/performance artifacts immediately after each story, and refusing to progress until independent acceptance criteria are verifiably met.

---
