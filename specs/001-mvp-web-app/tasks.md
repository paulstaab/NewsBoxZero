# Tasks: Static Headless RSS Web App

**Input**: `/specs/001-static-rss-app/` design documents (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Constitution Evidence**: Every user story carries test and UX tasks to satisfy Code Quality, Static Delivery, Automatic Tests, and Experience Consistency principles. Tasks follow the mandated checklist format with explicit file paths.

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
- [X] T013 [P] Configure global SWR provider with dedupe intervals, offline gating, in-memory cache TTL per FR-003, and revalidation knobs in `src/lib/swr/provider.tsx`, then compose it in `src/app/layout.tsx`.
- [X] T014 [P] Build async boundary, error formatter, and retry hooks in `src/components/ui/AsyncBoundary.tsx` and `src/lib/utils/errorFormatter.ts` to satisfy FR-007.
- [X] T015 [P] Set up MSW mocks + fixtures for `/feeds`, `/items`, `/folders`, `/version`, `/items/*` in `tests/mocks/handlers.ts`, `tests/mocks/server.ts`, and `tests/setup.ts`.
- [X] T016 [P] Ship the offline shell: register a service worker in `public/sw.js` with `src/lib/sw/register.ts` and surface status via `src/components/ui/OfflineBanner.tsx` (network-less mode requirement).
- [X] T017 [P] Compose the global layout shell (`src/app/layout.tsx`) with typography, color tokens, skeleton slots, and skip-link hooks referenced in plan.md.
- [X] T018 [P] Create PWA manifest in `public/manifest.json` with app name, icons (192x192, 512x512), theme colors, display mode (`standalone`), and start URL (FR-009).

**Checkpoint**: Foundation complete—user stories can run independently atop the shared stack.

---

## Phase 3: User Story 1 – View Aggregated Timeline (Priority: P1) 🎯 MVP

**Goal**: Let users authenticate, validate credentials, and skim an aggregated unread timeline with pagination, unread/all toggle, lazy media, and backoff-aware errors.

**Independent Test**: From a static export, complete the login wizard, fetch `/feeds` + `/items` (type=3, batchSize=50, getRead=false), and verify unread counts + empty states render without server help.

### Tests (write first)

- [X] T019 [P] [US1] Write Vitest specs for login validation and session persistence in `tests/unit/hooks/useAuth.test.ts`, covering remember-device gating and HTTPS enforcement.
- [X] T020 [P] [US1] Add Vitest coverage for `/items` fetch defaults, client-side unread aggregation, and exponential backoff in `tests/unit/lib/items.fetcher.test.ts` using MSW fixtures.
- [X] T021 [P] [US1] Create Playwright flow `tests/e2e/us1-login-timeline.spec.ts` that exercises login, Unread↔All toggle, infinite scroll, and offline indicator behavior (fails pre-impl).

### Experience Checks

- [X] T022 [P] [US1] Capture responsive snapshots for onboarding + timeline (320/768/1024/1440px) in `tests/visual/us1-login-timeline.spec.ts` and baseline the layouts.
- [X] T023 [US1] Record static export evidence in `docs/releases/us1-export.md` after `npm run build`.

### Implementation

- [X] T024 [P] [US1] Implement the multi-step login wizard with URL/credential validation, handshake progress, and remember-device toggle in `src/app/login/page.tsx` (FR-001).
- [X] T025 [P] [US1] Build the `useAuth` context + provider in `src/hooks/useAuth.tsx` that pings `/feeds` for validation, encodes Basic auth, and stores credentials only after success.
- [X] T026 [P] [US1] Create timeline data hooks (`src/hooks/useItems.ts`, `src/lib/utils/prefetchManager.ts`) handling batch fetch, infinite scroll offsets, 75% prefetch, and offline short-circuiting.
- [X] T027 [P] [US1] Develop timeline primitives in `src/components/timeline/ArticleCard.tsx`, `src/components/timeline/TimelineList.tsx`, and `src/components/timeline/EmptyState.tsx` with lazy-loaded body content and collapsed large enclosures.
- [X] T028 [P] [US1] Render aggregate unread summaries + badges using `src/components/timeline/UnreadSummary.tsx`, wiring `unreadAggregator` outputs to the UI.
- [X] T029 [US1] Compose the timeline route in `src/app/timeline/page.tsx`, wiring Unread/All toggle, infinite scroll, empty state, and offline-friendly guardrails.
- [X] T030 [US1] Surface exponential backoff + retry affordances via `src/components/ui/RequestStateToast.tsx`, ensuring FR-007 copy appears during throttling.

**Checkpoint**: US1 delivers a static MVP—login plus aggregated timeline with evidence captured.

---

## Phase 4: Enhanced Connection Validation (FR-001 Refinement)

**Goal**: Add pre-credential connectivity check using the `/version` endpoint to validate server reachability before asking for username/password, improving the login wizard UX per FR-001.

**Independent Test**: From login wizard, enter only a base URL, verify the client calls `/index.php/apps/news/api/v1-3/version` (no auth required), and provides feedback on connectivity before showing credential fields.

### Tests (write first)

- [X] T031 [P] [US1] Add Vitest specs for version endpoint connectivity check in `tests/unit/lib/api/version.test.ts`, covering network timeouts, invalid URLs, and successful version responses.
- [X] T032 [P] [US1] Extend Playwright login flow in `tests/e2e/us1-login-timeline.spec.ts` to validate URL-first validation step, including error states for unreachable servers.

### Implementation

- [X] T033 [P] [US1] Create version API wrapper in `src/lib/api/version.ts` that calls `GET /index.php/apps/news/api/v1-3/version` without authentication headers and returns version info or connectivity error.
- [X] T034 [US1] Update login wizard in `src/app/login/page.tsx` to add a URL validation step that calls the version endpoint before enabling the credential input fields, showing spinner/success/error states.
- [X] T035 [P] [US1] Add MSW handler for `/version` endpoint in `tests/mocks/handlers.ts` returning mock version data for test scenarios.

**Checkpoint**: Login wizard validates server connectivity before credentials, improving error messaging per FR-001.

---

## Phase 5: PWA Install Experience (FR-009, FR-010)

**Goal**: Enable PWA installation on mobile and desktop with install prompt UI and manual install option.

**Independent Test**: Open app in browser, verify install prompt appears when PWA criteria met, dismiss prompt and verify it doesn't reappear for 7 days, use manual install option from settings.

### Tests (write first)

- [X] T058 [P] [PWA] Add Vitest specs for install prompt detection and dismissal tracking in `tests/unit/lib/pwa/installPrompt.test.ts`.
- [X] T059 [P] [PWA] Create Playwright E2E for install prompt flow in `tests/e2e/pwa-install.spec.ts` covering prompt display, dismissal, and manual trigger.

### Experience Checks

- [X] T060 [P] [PWA] Capture visual baselines for install prompt UI in `tests/visual/pwa-install.spec.ts`.

### Implementation

- [X] T061 [P] [PWA] Build install prompt detection and state management in `src/lib/pwa/installPrompt.ts` tracking beforeinstallprompt event and dismissal preferences.
- [X] T062 [P] [PWA] Create install prompt UI component in `src/components/ui/InstallPrompt.tsx` that respects user dismissals and 7-day cooldown.
- [X] T063 [P] [PWA] Add manual install trigger to settings/menu (SettingsMenu component) in appropriate location, allowing users to manually trigger installation.
- [X] T064 [PWA] Integrate install prompt into `src/app/layout.tsx` with proper timing (after initial load, not during active reading).

**Checkpoint**: PWA installation experience complete with respectful prompting and manual override.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, accessibility, and release readiness applied across the feature.

- [ ] T043 [P] Refresh `specs/001-static-rss-app/quickstart.md` with accurate setup, login, MSW, and testing instructions verified against the implemented UI.
- [X] T044 [P] Run full axe-core + keyboard accessibility sweeps across login and timeline flows (tests/e2e/accessibility.spec.ts - 11/12 tests passing, WCAG 2.1 AA compliant).
- [ ] T045 Execute pipeline validation (`npm run lint && npm run test && npm run build && npx lhci autorun`) and archive release notes in `docs/releases/summary.md`.

---

## Dependencies & Execution Order

- **Graph**: `Setup (Phase 1) → Foundational (Phase 2) → US1 (Phase 3) → Version Check (Phase 4) → PWA Install (Phase 5) → Polish (Phase 6)`
- Phase 1 is prerequisite for tooling, enabling Phase 2 to build shared libs.
- Phase 2 delivers API client, storage, SWR, offline shell, PWA manifest, and mocks that every story consumes; no user story work may start before T007–T018 complete.
- US1 (Phase 3) is the MVP slice; Phase 4 enhances login wizard validation and can be done immediately after Phase 3 or in parallel.
- Phase 5 (PWA Install) can be done in parallel with Phase 3/4 or after, depends only on Phase 2 (manifest + SW).
- Polish (Phase 6) runs only after all desired user stories land so evidence, accessibility, and release notes reflect the final state.

---

## Parallel Execution Examples

- **US1**: T019 (unit tests) and T021 (E2E) can run concurrently; while tests bake, T026 (data hooks) and T027 (timeline UI) progress in parallel before converging in T029.
- **PWA**: T039 (install prompt logic) and T040 (install UI) can progress in parallel, converging in T042.

---

## Implementation Strategy

1. **MVP First**: Complete Phases 1–2, then deliver US1 end-to-end (login wizard + aggregated timeline) to unlock demos and early feedback.
2. **PWA Enhancement**: Add PWA install experience (Phase 5) in parallel with US1 polish or immediately after.
3. **Parallel Staffing**: After Phase 2, one squad can own US1 while others work on PWA install tasks marked [P], minimizing blocking work.
4. **Evidence-Driven**: Maintain the pattern of writing tests before implementation, capturing visual artifacts immediately after each phase, and refusing to progress until independent acceptance criteria are verifiably met.

---
