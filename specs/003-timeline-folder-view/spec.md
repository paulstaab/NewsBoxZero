# Feature Specification: Folder-Based Timeline View

**Feature Branch**: `003-timeline-folder-view`  
**Created**: December 16, 2025  
**Status**: Draft  
**Input**: User description: "Improve the timeline page. By default, it should show unread article by folder, with newest articles on top. on the bottom should be a button to mark all shown articles as read. when this button is pressed, the articles from the next folder should be shown. if all articles are read, this should be displayed instead. folders should be sorted by number of unread articles, with most unread articles first. there should also be skip button below the articles that goes to the next folder without marking the articles as read. For each article, title, summary and thumbnail should be show if available. the title should link to the article. clinking elsewhere on the article should show the full text if available. unread articles should be stored for the next visit / update. on each loading of the page, an update should be executed, which can also be triggered via the update button on top. The update adds new unread articles, but also keep the currently unread ones. read articles do not need to be stored."

## Clarifications

### Session 2025-12-16

- Q: How should the Skip action behave when the user reaches the last available folder? → A: Show an "all folders viewed" message with a restart button before the flow loops.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Unread Articles by Folder (Priority: P1)

A user opens the timeline page to see their unread articles organized by folder, with folders containing the most unread articles appearing first. Within each folder, the newest articles appear at the top, making it easy to start reading the most recent content from their highest-volume sources.

**Why this priority**: This is the core viewing experience that delivers immediate value - users can see their content organized meaningfully without needing to interact with any controls.

**Independent Test**: Can be fully tested by loading the timeline page with multiple folders containing unread articles and verifying the folder order (by unread count) and article order (newest first) delivers a functional reading experience.

**Acceptance Scenarios**:

1. **Given** user has 3 folders with 10, 5, and 15 unread articles respectively, **When** user opens timeline page, **Then** folders are displayed in order: folder with 15 unread, folder with 10 unread, folder with 5 unread
2. **Given** user has unread articles in a folder with publication dates of Dec 10, Dec 12, and Dec 8, **When** viewing that folder's articles, **Then** articles are ordered: Dec 12, Dec 10, Dec 8
3. **Given** user has folders with unread articles, **When** timeline page loads, **Then** only articles from the first folder (highest unread count) are displayed
4. **Given** user has no unread articles, **When** user opens timeline page, **Then** a message indicates all articles are read

---

### User Story 2 - Mark Folder as Read and Progress (Priority: P1)

A user finishes reading articles from the current folder and clicks the "Mark All as Read" button to mark all displayed articles as read and automatically advance to the next folder's articles. This creates a focused, progressive reading flow.

**Why this priority**: This enables the primary interaction pattern for consuming content - users can process one folder at a time and mark their progress.

**Independent Test**: Can be fully tested by displaying articles from one folder, clicking the mark-as-read button, and verifying the next folder's articles appear and the previous articles are marked as read.

**Acceptance Scenarios**:

1. **Given** user is viewing articles from folder A, **When** user clicks "Mark All as Read", **Then** all displayed articles are marked as read AND articles from the next folder (by unread count) are displayed
2. **Given** user marks the last folder's articles as read, **When** the mark action completes, **Then** the "all articles read" message is displayed
3. **Given** user returns to the timeline after marking folders as read, **When** page loads, **Then** previously marked articles remain read and do not reappear

---

### User Story 3 - Skip to Next Folder (Priority: P2)

A user wants to skip the current folder's articles without marking them as read (perhaps to return later) and immediately see articles from the next folder. The user clicks a "Skip" button below the articles to advance to the next folder while preserving the unread status.

**Why this priority**: Provides flexibility in the reading workflow, allowing users to browse through folders without committing to mark articles as read.

**Independent Test**: Can be fully tested by viewing one folder's articles, clicking the skip button, and verifying the next folder's articles appear while the previous folder's articles remain unread.

**Acceptance Scenarios**:

1. **Given** user is viewing articles from folder A with unread articles, **When** user clicks "Skip", **Then** articles from the next folder are displayed AND folder A's articles remain unread
2. **Given** user skips to the last folder, **When** user clicks "Skip" again, **Then** system displays an "all folders viewed" message with a button to restart reviewing folders
3. **Given** user has previously skipped folders, **When** user returns to timeline, **Then** skipped articles remain unread and are displayed according to folder priority

---

### User Story 4 - View Article Details (Priority: P2)

A user wants to read more about an article and can click the article title to open the original article in a new tab/window, or click anywhere else on the article card to expand and view the full text inline (if available). This provides flexible access to article content.

**Why this priority**: Essential for content consumption but secondary to the organizational structure - users need to view what they've organized.

**Independent Test**: Can be fully tested by displaying articles with titles and full text, clicking the title to verify external navigation, and clicking the article body to verify inline expansion.

**Acceptance Scenarios**:

1. **Given** user sees an article card with title, **When** user clicks the article title, **Then** the original article opens in a new browser tab/window
2. **Given** user sees an article card with available full text, **When** user clicks on the article card (not the title), **Then** the full text expands inline within the timeline
3. **Given** user expands an article card to read the inline content, **When** the expanded state is shown, **Then** that article is immediately marked as read and removed from the unread count for its folder
4. **Given** article does not have full text available, **When** user clicks the article card, **Then** system indicates full text is unavailable OR shows only the summary
5. **Given** article card displays title, summary, and thumbnail, **When** user views the card, **Then** all three elements are visible and properly formatted

---

### User Story 5 - Update and Persist Unread Status (Priority: P1)

The timeline automatically checks for new articles each time the page loads, and users can also manually trigger an update using a button at the top of the page. Updates fetch new unread articles from feeds and preserve the unread status of existing articles, ensuring users never lose track of what they haven't read yet.

**Why this priority**: Critical for the feature to remain useful over time - users must see new content and maintain their reading state across sessions.

**Independent Test**: Can be fully tested by loading the timeline, noting unread articles, triggering an update, and verifying new articles appear while previously unread articles remain unread.

**Acceptance Scenarios**:

1. **Given** user opens timeline page, **When** page loads, **Then** system automatically checks for new unread articles
2. **Given** user is viewing the timeline, **When** user clicks the "Update" button, **Then** system fetches new articles and adds them to the appropriate folders
3. **Given** user has 5 unread articles and an update finds 3 new articles, **When** update completes, **Then** user has 8 unread articles total (5 existing + 3 new)
4. **Given** user closes and reopens the timeline, **When** page loads, **Then** previously unread articles remain unread
5. **Given** user has marked articles as read, **When** page reloads, **Then** read articles are not displayed and are not stored

---

### Edge Cases

- What happens when a folder has zero unread articles after marking some as read? The folder should be removed from the timeline view and the next folder should be displayed.
- What happens when all folders have been viewed/skipped? System should display a "You've viewed all folders" message with a restart button that, when clicked, begins the folder sequence again.
- What happens when a new article arrives in a folder that was previously viewed/skipped? The folder should reappear in the list based on its new unread count.
- What happens when an article has no title? Display a placeholder like "(Untitled)" or use the first words of the summary.
- What happens when an article has no summary or thumbnail? Display only the available information (title-only is acceptable).
- What happens during an update if the network is unavailable? Display an error message indicating the update failed and allow retry.
- What happens if an update takes a long time? Show a loading indicator to communicate progress.
- What happens when a user clicks "Mark All as Read" while on the last folder? Display the "all articles read" message immediately.

## Requirements *(mandatory)*

### Functional Requirements

**Display & Organization**

- **FR-001**: System MUST display unread articles grouped by their parent folder
- **FR-002**: System MUST sort folders by number of unread articles in descending order (most unread first)
- **FR-003**: System MUST sort articles within each folder by publication date in descending order (newest first)
- **FR-004**: System MUST display only one folder's articles at a time on the timeline
- **FR-005**: System MUST display article title, summary, and thumbnail for each article when available
- **FR-006**: System MUST show a message when all articles are read with no unread content remaining

**Article Interaction**

- **FR-007**: Article title MUST be a clickable link that opens the original article in a new browser tab/window
- **FR-008**: Clicking on the article card (excluding the title) MUST expand the full article text inline when available and immediately mark that article as read
- **FR-009**: System MUST handle missing article elements gracefully (missing title, summary, or thumbnail)

**Read State Management**

- **FR-010**: System MUST provide a "Mark All as Read" button below displayed articles
- **FR-011**: When "Mark All as Read" is clicked, system MUST mark all currently displayed articles as read
- **FR-012**: After marking articles as read, system MUST automatically display articles from the next folder (by unread count)
- **FR-013**: System MUST persist unread article status across browser sessions
- **FR-014**: System MUST NOT store or persist read articles
- **FR-015**: System MUST preserve unread status when page is reloaded or revisited

**Folder Navigation**

- **FR-016**: System MUST provide a "Skip" button below displayed articles
- **FR-017**: When "Skip" is clicked, system MUST display articles from the next folder without marking current articles as read; if the user skips beyond the final folder, the system MUST show an "all folders viewed" message with a restart button
- **FR-018**: System MUST maintain logical folder progression when skipping (next folder by unread count)

**Content Updates**

- **FR-019**: System MUST automatically fetch new articles when the timeline page loads
- **FR-020**: System MUST provide an "Update" button at the top of the timeline page
- **FR-021**: When "Update" is triggered, system MUST fetch new unread articles from all feeds
- **FR-022**: Updates MUST add new articles while preserving existing unread articles
- **FR-023**: Updates MUST refresh folder sorting based on updated unread counts
- **FR-024**: System MUST provide feedback during update operations (loading state)

### Key Entities

- **Unread Article**: Represents an article that has not been marked as read. Contains: unique identifier, title (optional), summary (optional), thumbnail URL (optional), full text content (optional), publication date, original article URL, parent folder reference, timestamp when marked as unread
- **Folder**: A collection of feed sources that groups articles together. Contains: unique identifier, name, list of articles, unread article count (derived from articles within the folder)
- **Article Read State**: Tracks whether an article is read or unread. Only unread articles are tracked/stored. Read articles are removed from local storage

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: The timeline shall use existing design tokens from the component library for colors, spacing (following 8px grid), and typography. All interactive elements (buttons, article cards) must meet WCAG 2.1 AA contrast requirements (4.5:1 for text). Keyboard navigation must support Tab through articles, Enter to activate links/expand, and Space for button actions. Validation will occur through automated accessibility testing tools and manual keyboard-only navigation tests.

- **Responsive Behavior**: Timeline layout must adapt across three breakpoints:
  - Mobile (320px-768px): Single-column layout with full-width article cards, stacked action buttons
  - Tablet (769px-1024px): Single-column with constrained max-width (720px) centered, article cards with optimized spacing
  - Desktop (1025px-1440px): Single-column with max-width (960px) centered, larger thumbnail sizes, side-by-side buttons
  
  Acceptance: Each breakpoint must render articles legibly with appropriate touch/click targets (minimum 44x44px on mobile).

- **Visual Regression Proof**: Visual regression tests shall capture:
  - Timeline with articles from multiple folders (folder header + 3 articles)
  - "Mark All as Read" and "Skip" button states (default, hover, active, disabled)
  - Article card variations (with/without thumbnail, with/without summary, expanded state)
  - Empty state ("all articles read" message)
  - Loading state during updates
  
  Tests will be implemented using Playwright visual testing, with pixel-diff threshold of 0.1% to catch layout regressions while allowing for minor rendering differences.

- **Data Loading Strategy**: On initial page load, unread articles shall be loaded from local storage (instant display, no network delay). Background update fetches new articles via the feeds endpoint without blocking user interaction. Article thumbnails shall be lazy-loaded as they enter viewport (using Intersection Observer pattern) to minimize initial bandwidth usage. Full article text shall be fetched on-demand when user expands an article card (not preloaded).

- **Static Build Strategy**: The timeline page shall be statically generated as a client-side application shell (no article content at build time). During static build, only the page structure, styles, and empty state components are rendered. On client-side hydration, the application reads unread article data from local storage and renders the timeline dynamically. The build command `npm run build` produces static HTML/CSS/JS assets that can be deployed without server-side rendering. Initial article fetch occurs via client-side API calls to the feeds service after page hydration completes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their unread articles organized by folder within 500ms of page load (loading from local storage)
- **SC-002**: Timeline page renders correctly on screens from 320px to 1440px width without horizontal scrolling or layout breaks
- **SC-003**: 95% of users can successfully mark a folder as read and advance to the next folder within 2 clicks
- **SC-004**: Unread article state persists across browser sessions with 100% accuracy (articles marked as read do not reappear)
- **SC-005**: Article updates complete within 10 seconds for feeds with up to 100 total articles across all folders
- **SC-006**: Users can navigate the timeline using only keyboard controls (Tab, Enter, Space) without requiring a mouse
- **SC-007**: All interactive elements (buttons, links, article cards) meet WCAG 2.1 AA accessibility standards for contrast and keyboard navigation
- **SC-008**: Users can process articles from one folder at a time, reducing cognitive load compared to viewing all articles simultaneously
- **SC-009**: Skip functionality allows users to browse through all folders without marking articles as read, providing non-destructive exploration

## Assumptions

1. **Local Storage Availability**: We assume users have local storage enabled in their browsers for persisting unread article state. If local storage is unavailable, the application will degrade gracefully by operating in a session-only mode where unread state is lost on page close.

2. **Article Publication Dates**: We assume all articles have valid publication dates provided by the feed source. If dates are missing, articles will be ordered by their fetch timestamp as a fallback.

3. **Folder Assignment**: We assume articles are already assigned to folders through the existing feed organization structure (each feed belongs to a folder). This feature does not handle folder creation or reassignment.

4. **Update Frequency**: We assume automatic updates on page load are acceptable and do not require user permission. Users who want to control updates can simply avoid clicking the manual "Update" button.

5. **Thumbnail Formats**: We assume article thumbnails are provided as web-compatible image URLs (JPEG, PNG, WebP). Image rendering and format support rely on standard browser capabilities.

6. **Single User Context**: We assume the timeline operates in a single-user context (no multi-user or shared device scenarios). Unread state is stored per browser, not per user account.

7. **Network Availability**: We assume intermittent network connectivity is acceptable. The timeline displays cached unread articles even when offline, and updates only require network access.

8. **Folder Ordering Stability**: When folders have equal unread counts, we assume alphabetical ordering by folder name as the tiebreaker to ensure consistent display order.

9. **Full Text Availability**: We assume not all articles will have full text available. The expand feature gracefully handles articles with only summaries or titles.

10. **Browser Compatibility**: We assume users are on modern browsers (released within the last 2 years) that support ES6, local storage, and Intersection Observer APIs.
