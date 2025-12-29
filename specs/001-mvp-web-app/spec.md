# Feature Specification: MVP Progressive Headless RSS Web App

**Feature Branch**: `001-pwa-rss-app`  
**Created**: 2025-12-10  
**Status**: Draft  
**Input**: User description: "I want to build a progressive web app that displays aggregated rss feed for a user. it should be able to act as a front-end for an headless-rss backend (https://github.com/paulstaab/headless-rss). It should use the Nextcloud v1.3 API provided by headless-rss. The openapi spec for it is available in .specify/memory/headless-rss-openapi.json. Only use endpoints below /index.php/apps/news/api/v1-3.It should have a login wizzard and a main page for looking at the lastest article. It should be possible for a user to mark feeds are read. Do not include feed and folder management for now."

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

**Why this priority**: This is the primary value of NewsBoxZero—surfacing a single, readable timeline. Without it, the app delivers no user benefit.

**Independent Test**: Launch the static build, provide valid API base URL + app password, and confirm the timeline renders the latest $N$ items with unread badges using only `/index.php/apps/news/api/v1-3/items` and `/feeds` calls.

**Acceptance Scenarios**:

1. **Given** valid credentials, **When** the user loads the app, **Then** the client fetches `/index.php/apps/news/api/v1-3/items` with default parameters (`type=3`, `batchSize=50`, `getRead=false`) and renders articles sorted by `lastModified` with read/unread visual cues.
2. **Given** there are zero unread items, **When** the timeline loads, **Then** the UI shows an "All caught up" empty state without network errors and no layout shift.
3. **Given** the user scrolls beyond the first batch, **When** the viewport nears the end, **Then** the client requests the next batch using `offset` pagination without duplicating items.
4. **Given** the user switches the timeline toggle from "Unread" to "All", **When** the toggle changes, **Then** the client reissues the `/items` request with `getRead=true` and blends read history without a full reload.
5. **Given** the user has previously loaded the timeline, **When** the user goes offline and reopens the app, **Then** the service worker serves cached content and displays an offline banner without showing network errors.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Invalid credentials or revoked Nextcloud app passwords must surface a blocking error with remediation steps without caching failed responses.
- API throttling or >2s latency should trigger exponential backoff with user-visible retry affordances.
- Items containing large enclosures (audio/video) should collapse media previews by default.
- Network-less mode should serve cached content via service worker, keep the app shell usable, and show an offline banner; background sync should queue mutation requests until connectivity returns.
- Service worker updates should prompt the user to reload when a new version is detected without disrupting active reading sessions.
- Install prompts should respect the user's "dismiss" choice and not re-prompt for at least 7 days unless manually triggered from app settings.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: On first load present a guided login wizard that asks for the server base URL, validates connectivity via `GET /index.php/apps/news/api/v1-3/version` (before requesting credentials), then asks for Nextcloud username and app password, tests authentication with those credentials, and stores them in session storage by default, with an optional "Remember this device" toggle that moves them to local storage only after a successful handshake.
- **FR-002**: Authenticate every API call using HTTP Basic auth by sending `Authorization: Basic base64(USER:PASSWORD)` over HTTPS; block execution if the host is non-HTTPS and surface errors when authentication fails.
- **FR-003**: Fetch feeds via `GET /index.php/apps/news/api/v1-3/feeds` and folders via `GET /index.php/apps/news/api/v1-3/folders` on load and on-demand refresh, caching results in memory.
- **FR-004**: Render the aggregated timeline using `GET /index.php/apps/news/api/v1-3/items` with support for pagination (`batchSize`, `offset`), filtering by type (`feed`, `folder`, `starred`, `all`), and toggles for `getRead` and `oldestFirst`, defaulting to `getRead=false` while exposing an inline toggle to include read items on demand without a page reload.
- **FR-005**: Display unread counts per feed and folder by computing them client-side from `/index.php/apps/news/api/v1-3/items` responses (tallying `unread=true` articles per feed and aggregating to folders); treat these client-aggregated values as the source of truth even if the feeds API exposes its own unread counts, and keep counts synchronized after user actions without full reloads.
- **FR-006**: Persist lightweight client preferences (view mode, sort order) in local storage without storing feed content to respect privacy expectations.
- **FR-007**: Provide graceful error handling for HTTP 4xx/5xx responses with actionable copy and retry controls; errors must not leave the UI in an indeterminate state.
- **FR-008**: Register a service worker that implements a cache-first strategy for static assets (JS, CSS, fonts, icons) and a network-first with cache fallback strategy for API responses, storing up to 50 articles and their media for offline access.
- **FR-009**: Provide a web app manifest (`manifest.json`) with app name, icons (192x192, 512x512), theme colors, display mode (`standalone`), and start URL to enable installation on mobile and desktop platforms.
- **FR-010**: Display an install prompt when the PWA install criteria are met (HTTPS, manifest, service worker) and allow users to add the app to their home screen or desktop; honor user dismissals and provide a manual install option in settings.
- **FR-011**: Queue mutation requests in IndexedDB when offline and replay them via background sync when connectivity returns, with conflict resolution that defers to server state on mismatch.

### Key Entities *(include if feature involves data)*

- **UserSessionConfig**: Captures API base URL, encoded HTTP Basic credentials, preferred view settings, and last sync time; stored locally and never serialized to the build.
- **Feed**: Mirrors `src__api__nextcloud_news__v1_2__feed__Feed` with id, title, favicon, folderId, ordering, unread counts, and pinned state; feeds belong to folders and drive sidebar navigation.
- **Folder**: Mirrors `src__api__nextcloud_news__v1_2__folder__Folder` with id/name metadata and aggregated unread counts; root folder id `null` groups uncategorized feeds.
- **Article**: Mirrors `src__api__nextcloud_news__v1_3__item__Article` with guid/guidHash, content, media metadata, read/starred flags, and timestamps; forms the main timeline list.
- **ReadStateMutation**: Represents bulk actions (mark read, star, move) queued client-side and replayed against the API with optimistic UI updates and rollback metadata.

### Assumptions

- Headless-rss exposes the Nextcloud API over HTTPS with CORS headers that allow the PWA's origin.
- Users authenticate with Nextcloud app passwords created specifically for headless-rss; tokens can be revoked without affecting other services.
- Server time and client time are roughly in sync (±5s) so pagination based on `lastModified` behaves predictably.
- The hosting provider serves the PWA over HTTPS with appropriate headers for service worker registration and supports immutable deployments.
- The service worker has access to Cache Storage API and IndexedDB for offline data persistence.

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: Use the shared NewsBoxZero token set (`src/styles/tokens.css`) for color/spacing/typography, maintain WCAG 2.1 AA contrast (≥4.5:1) verified via axe-core CI, and ensure keyboard focus order matches visual order (sidebar → timeline → article panel). Microcopy must follow the existing tone in README examples.
- **Responsive Behavior**: Support breakpoints at 320px (single-column stack), 768px (sidebar collapsible), 1024px (two-column layout), and 1440px (three-panel view). Acceptance involves Percy snapshots at each breakpoint showing intact navigation, readable typography, and overflow handling for long feed names.
- **Visual Regression Proof**: Capture Percy (or Playwright screenshot) suites covering onboarding, empty state, timeline with media, and read state management. Diffs must be reviewed and approved in PR checklists.
- **Data Loading Strategy**: Lazy-load article content only when the card scrolls into view, prefetch next batches when 75% scroll depth is reached, and throttle folder/feed refreshes unless triggered manually. Service worker should precache critical assets and implement runtime caching for API responses.
- **PWA Build Strategy**: The app compiles via `npm run build` with Next.js static export into assets served from `/out`, including a service worker and manifest.json. Build-time data is limited to configuration defaults; runtime hydration prompts the user for credentials, then fetches data client-side with service worker caching. Service worker must pass Lighthouse PWA audit including manifest validation, offline support, and installability criteria.
- **Offline-First Architecture**: Implement a layered caching strategy where the app shell (HTML, CSS, JS) is cached on install, API responses are cached on fetch, and article images use cache-first with fallback. Mutations are queued in IndexedDB and synced when online.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Removed
- **SC-002**: Removed
- **SC-003**: At least 90% of usability test participants complete the onboarding + timeline browsing flow without assistance, and axe-core reports 0 critical accessibility violations per release.
- **SC-004**: The PWA build deploys as immutable artifacts with zero runtime server dependencies.
- **SC-005**: The PWA passes Lighthouse PWA installability criteria (service worker, manifest, HTTPS) and achieves ≥95 for Accessibility.
- **SC-006**: At least 80% of cached content remains accessible when users go offline, with mutation requests successfully queued and synced when connectivity returns.

