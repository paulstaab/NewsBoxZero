# Feature Specification: Static Headless RSS Web App

**Feature Branch**: `001-static-rss-app`  
**Created**: 2025-12-10  
**Status**: Draft  
**Input**: User description: "I want to build a static web app that displays aggregated rss feed for a user. it should be able to act as a front-end for an headless-rss backend (https://github.com/paulstaab/headless-rss). It should use the Nextcloud v1.3 API provided by headless-rss. The openapi spec for it is available in .specify/memory/headless-rss-openapi.json. Only use endpoints below /index.php/apps/news/api/v1-3"

## Clarifications

### Session 2025-12-10

- Q: Should the aggregated timeline default to unread-only or blend read/unread items? → A: Default to unread-only but expose an adjacent toggle that switches to "All" (read + unread) without reloading.
- Q: How should credentials be persisted after the login wizard? → A: Default to session storage, but offer a "Remember this device" toggle that switches persistence to local storage when users explicitly opt in.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - View Aggregated Timeline (Priority: P1)

As a headless-rss user, I want to log in with my Nextcloud credentials and immediately see an aggregated, chronologically sorted list of unread and recent articles across all of my feeds so I can skim news quickly.

**Why this priority**: This is the primary value of Feedfront—surfacing a single, readable timeline. Without it, the app delivers no user benefit.

**Independent Test**: Launch the static build, provide valid API base URL + app password, and confirm the timeline renders the latest $N$ items with unread badges using only `/index.php/apps/news/api/v1-3/items` and `/feeds` calls.

**Acceptance Scenarios**:

1. **Given** valid credentials, **When** the user loads the app, **Then** the client fetches `/index.php/apps/news/api/v1-3/items` with default parameters (`type=3`, `batchSize=50`, `getRead=false`) and renders articles sorted by `lastModified` with read/unread visual cues.
2. **Given** there are zero unread items, **When** the timeline loads, **Then** the UI shows an "All caught up" empty state without network errors and no layout shift.
3. **Given** the user scrolls beyond the first batch, **When** the viewport nears the end, **Then** the client requests the next batch using `offset` pagination without duplicating items.
4. **Given** the user switches the timeline toggle from "Unread" to "All", **When** the toggle changes, **Then** the client reissues the `/items` request with `getRead=true` and blends read history without a full reload.

---

### User Story 2 - Organize & Update Read State (Priority: P2)

As a user, I want to navigate folders/feeds, filter items, and mark or star articles so that my read state stays consistent with the headless-rss backend.

**Why this priority**: Users expect parity with their feed reader—without proper organization and state sync, the timeline becomes noisy.

**Independent Test**: With an existing account that has multiple folders, verify that switching folders updates the query (`type` + `id`), that mark-read/unread/star actions hit the corresponding v1.3 endpoints, and that unread counters refresh without reloading the page.

**Acceptance Scenarios**:

1. **Given** the user selects a folder, **When** they change the filter to that folder, **Then** the client re-fetches items with `type=1` (folder) and `id=<folder_id>` and refreshes the timeline within 500ms.
2. **Given** the user taps "Mark as read" on an item, **When** the action completes, **Then** `/index.php/apps/news/api/v1-3/items/{item_id}/read` responds 200 and the UI updates the unread badge locally without a full reload.
3. **Given** the user stars multiple items, **When** they submit the bulk action, **Then** `/index.php/apps/news/api/v1-3/items/star/multiple` is called with the selected GUID hashes and the UI reflects the starred state even if the network request is slow (optimistic update + rollback on failure).

---

### User Story 3 - Manage Subscriptions (Priority: P3)

As a user, I want to add, rename, move, or delete feeds and folders so that I can curate my sources without leaving Feedfront.

**Why this priority**: Subscription management is secondary to reading but essential for retaining users who want a single front-end on top of headless-rss.

**Independent Test**: Using only the static UI, perform each CRUD action (create folder, rename feed, move feed, delete feed) via the v1.3 endpoints and verify changes propagate to the timeline without manual refresh.

**Acceptance Scenarios**:

1. **Given** a valid feed URL, **When** the user submits it, **Then** `/index.php/apps/news/api/v1-3/feeds` (POST) is called, success feedback is shown, and the new feed appears in the sidebar with `unread=0`.
2. **Given** a feed assigned to Folder A, **When** the user moves it to Folder B, **Then** `/index.php/apps/news/api/v1-3/feeds/{feed_id}/move` responds 200 and the navigation tree updates within 1s.
3. **Given** a folder rename request, **When** `/index.php/apps/news/api/v1-3/folders/{folder_id}` (PUT) succeeds, **Then** the UI reflects the new label everywhere (timeline badges, dropdowns) without stale text.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Invalid credentials or revoked Nextcloud app passwords must surface a blocking error with remediation steps without caching failed responses.
- Feed or folder lists longer than 1,000 entries must virtualize the sidebar and throttle `/feeds` refreshes to avoid layout jank.
- API throttling or >2s latency should trigger exponential backoff with user-visible retry affordances.
- Items containing large enclosures (audio/video) should collapse media previews by default to stay within performance and bundle budgets.
- Network-less mode should keep the static shell usable and show an offline indicator; no requests should be attempted until connectivity returns.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: On first load present a guided login wizard that asks for the server base URL, validates connectivity via `GET /index.php/apps/news/api/v1-3/version` (before requesting credentials), then asks for Nextcloud username and app password, tests authentication with those credentials, and stores them in session storage by default, with an optional "Remember this device" toggle that moves them to local storage only after a successful handshake.
- **FR-002**: Authenticate every API call using HTTP Basic auth by sending `Authorization: Basic base64(USER:PASSWORD)` over HTTPS; block execution if the host is non-HTTPS and surface errors when authentication fails.
- **FR-003**: Fetch feeds via `GET /index.php/apps/news/api/v1-3/feeds` and folders via `GET /index.php/apps/news/api/v1-3/folders` on load and on-demand refresh, caching results in memory for ≤5 minutes.
- **FR-004**: Render the aggregated timeline using `GET /index.php/apps/news/api/v1-3/items` with support for pagination (`batchSize`, `offset`), filtering by type (`feed`, `folder`, `starred`, `all`), and toggles for `getRead` and `oldestFirst`, defaulting to `getRead=false` while exposing an inline toggle to include read items on demand without a page reload.
- **FR-005**: Display unread counts per feed and folder by computing them client-side from `/index.php/apps/news/api/v1-3/items` responses (tallying `unread=true` articles per feed and aggregating to folders); treat these client-aggregated values as the source of truth even if the feeds API exposes its own unread counts, and keep counts synchronized after user actions without full reloads.
- **FR-006**: Allow marking single or multiple items as read/unread/starred by calling the appropriate v1.3 endpoints (`/items/{item_id}/read`, `/items/{item_id}/unread`, `/items/star/multiple`, `/items/unstar/multiple`, `/items/read/multiple`).
- **FR-007**: Allow marking feeds or folders entirely read via `/feeds/{feed_id}/read` and `/folders/{folder_id}/read` with optimistic UI updates.
- **FR-008**: Support adding feeds (`POST /feeds`), deleting feeds (`DELETE /feeds/{feed_id}`), renaming feeds (`POST /feeds/{feed_id}/rename`), and moving feeds (`POST /feeds/{feed_id}/move`).
- **FR-009**: Support folder CRUD via `/folders` (POST), `/folders/{folder_id}` (PUT/DELETE) while preventing destructive actions when feeds still exist unless the API confirms cascading behavior.
- **FR-010**: Persist lightweight client preferences (view mode, sort order) in local storage without storing feed content to respect privacy expectations.
- **FR-011**: Expose diagnostics (last sync timestamp, current API host) in a debug drawer to satisfy Constitution observability requirements.
- **FR-012**: Provide graceful error handling for HTTP 4xx/5xx responses with actionable copy and retry controls; errors must not leave the UI in an indeterminate state.

### Key Entities *(include if feature involves data)*

- **UserSessionConfig**: Captures API base URL, encoded HTTP Basic credentials, preferred view settings, and last sync time; stored locally and never serialized to the build.
- **Feed**: Mirrors `src__api__nextcloud_news__v1_2__feed__Feed` with id, title, favicon, folderId, ordering, unread counts, and pinned state; feeds belong to folders and drive sidebar navigation.
- **Folder**: Mirrors `src__api__nextcloud_news__v1_2__folder__Folder` with id/name metadata and aggregated unread counts; root folder id `null` groups uncategorized feeds.
- **Article**: Mirrors `src__api__nextcloud_news__v1_3__item__Article` with guid/guidHash, content, media metadata, read/starred flags, and timestamps; forms the main timeline list.
- **ReadStateMutation**: Represents bulk actions (mark read, star, move) queued client-side and replayed against the API with optimistic UI updates and rollback metadata.

### Assumptions

- Headless-rss exposes the Nextcloud API over HTTPS with CORS headers that allow the static frontend’s origin.
- Users authenticate with Nextcloud app passwords created specifically for headless-rss; tokens can be revoked without affecting other services.
- Server time and client time are roughly in sync (±5s) so pagination based on `lastModified` behaves predictably.
- The CDN hosting Feedfront supports immutable deployments and can cache static assets for ≥30 days.

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: Use the shared Feedfront token set (`src/styles/tokens.css`) for color/spacing/typography, maintain WCAG 2.1 AA contrast (≥4.5:1) verified via axe-core CI, and ensure keyboard focus order matches visual order (sidebar → timeline → article panel). Microcopy must follow the existing tone in README examples.
- **Responsive Behavior**: Support breakpoints at 320px (single-column stack), 768px (sidebar collapsible), 1024px (two-column layout), and 1440px (three-panel view). Acceptance involves Percy snapshots at each breakpoint showing intact navigation, readable typography, and overflow handling for long feed names.
- **Visual Regression Proof**: Capture Percy (or Playwright screenshot) suites covering onboarding, empty state, timeline with media, and subscription management modals. Diffs must be reviewed and approved in PR checklists.
- **Performance Budgets**: Keep the main JavaScript bundle ≤180KB gzip, CSS ≤60KB gzip.
- **Data Loading Strategy**: Lazy-load article content only when the card scrolls into view, prefetch next batches when 75% scroll depth is reached, and throttle folder/feed refreshes to once per 30s unless triggered manually. All API calls must append a user agent header for observability.
- **Static Build Strategy**: The app compiles via `npm run build && npm run export` into static assets served from `/out`. Build-time data is limited to configuration defaults; runtime hydration prompts the user for credentials, then fetches data client-side. A mock API fixture is bundled for automated tests so the static export remains deterministic.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Removed
- **SC-002**: Removed
- **SC-003**: At least 90% of usability test participants complete the onboarding + timeline browsing flow without assistance, and axe-core reports 0 critical accessibility violations per release.
- **SC-004**: The static export stays under 30MB total asset weight and deploys as immutable artifacts with zero runtime server dependencies, ensuring CDN cache hit rate ≥95%.

