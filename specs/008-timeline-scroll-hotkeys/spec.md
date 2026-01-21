# Feature Specification: Timeline scroll & hotkeys

**Feature Branch**: `008-timeline-scroll-hotkeys`  
**Created**: 2026-01-21  
**Status**: Draft  
**Input**: User description: "Improve the scrolling behaviour of the timeline. The folder queue should dock to the top of page when scrolled past it, so that it remains always visible. article that a scrolled out of the top of the timeline should be marked as read, but should remain visible until the next reload. Finally, scrolling with hotkeys should be possible using the arrow up and down keys. On the first press of these keys, the article currently at the top of the page should be visually selected. it should then be possible to scroll to and select the next article use the up and down arrow keys. A selected article should be marked as read when it is unselected, but again remain visible until next reload."

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

### User Story 1 - Stay oriented while scrolling (Priority: P1)

Keeping the folder queue visible and marking articles as read when they leave the top of the viewport helps users track progress without losing navigation controls.

**Why this priority**: It preserves orientation during long reading sessions and avoids re-scrolling to reach the folder queue.

**Independent Test**: Scroll through the timeline with pointer or touch; verify the folder queue docks after scrolling past it, remains accessible, and articles crossed past the top are marked read without disappearing. Scroll back to top to confirm unsticking behavior.

**Acceptance Scenarios**:

1. **Given** the user loads the page or scrolls to the top, **When** the folder queue is visible in its original position, **Then** it is not docked (appears normally below the page heading).
2. **Given** the user has scrolled beyond the folder queue's original position, **When** the queue reaches the top of the viewport, **Then** it docks (becomes sticky) and stays visible as the user continues scrolling.
3. **Given** the folder queue is docked, **When** the user scrolls back up to reveal the queue's original position, **Then** the queue unsticks and returns to its natural position below the heading.
4. **Given** an unread article fully crosses the top edge of the timeline, **When** it leaves the visible top edge, **Then** it is marked read while still remaining in the list.

---

### User Story 2 - Keyboard navigation through articles (Priority: P2)

Arrow keys should let users move article-by-article, starting from the top-most visible article, with clear selection feedback.

**Why this priority**: Enables efficient, accessible navigation for keyboard-first users and power readers.

**Independent Test**: Use only Arrow Up/Down on a timeline view; confirm the first key press selects the top article, subsequent presses move selection and scroll as needed, and deselected articles are marked read.

**Acceptance Scenarios**:

1. **Given** focus is on the timeline and no article is selected, **When** the user presses Arrow Down or Arrow Up, **Then** the article at the top of the viewport becomes visually selected.
2. **Given** an article is selected, **When** the user presses Arrow Down, **Then** the next article becomes selected, the view scrolls to keep it in view, and the previous selection is marked read.
3. **Given** the first article in the list is selected, **When** the user presses Arrow Up, **Then** the selection does not move above the list and remains on the first article without errors.

---

### User Story 3 - Keep read items visible until reload (Priority: P3)

Read items should stay in the timeline until the next reload so users can re-open or review them within the same session.

**Why this priority**: Avoids surprises where items vanish, allowing users to continue browsing without losing context.

**Independent Test**: Mark items as read via scrolling or deselection; confirm they stay visible and remain accessible until the page is reloaded.

**Acceptance Scenarios**:

1. **Given** an article was marked read earlier in the session, **When** the user scrolls back to it without reloading, **Then** it remains visible and can be opened again.
2. **Given** multiple articles are marked read, **When** the user reloads the page, **Then** the timeline reflects whatever default or persisted ordering is expected for a fresh load.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Rapid flick or page-down scrolling that skips multiple articles should still mark each article that passes the top edge as read without missing any.
- Very short articles near the top should not auto-mark as read until they fully cross the top edge to prevent premature read state changes.
- Empty or nearly empty timelines should not crash; arrow keys should have no effect and should not throw errors when no articles exist.
- Arrow keys pressed while typing in a search or filter field should not hijack input focus; only when timeline has focus should hotkeys take over.
- When the folder queue height changes (e.g., dynamic content), docking should adjust smoothly without covering timeline content.
- If network latency delays read-state persistence, the UI should still show read state locally without waiting for a round trip.

### Assumptions

- Read status changes apply within the current session and may sync according to existing read-status rules without removing items from the timeline until reload.
- Keyboard navigation is available when the timeline region is focused; other controls (e.g., modals) retain their own keyboard handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Initially, the folder queue appears in its natural position below the page heading (not docked). Once the user scrolls and the queue's original position moves out of view, the folder queue docks to the top of the viewport (becomes sticky) and remains visible while the user continues scrolling.
- **FR-001a**: When the user scrolls back up to reveal the folder queue's original position, the queue unsticks and returns to its natural (non-sticky) state below the heading.
- **FR-002**: Docked folder queue does not obscure timeline content; the timeline adjusts positioning so content stays readable beneath or below the docked queue.
- **FR-003**: An unread article is marked read when it fully crosses the top edge of the visible timeline during scrolling, without being removed from the list.
- **FR-004**: Read articles remain visible in their current position until the user reloads the page; no auto-hiding or removal occurs mid-session.
- **FR-005**: Pressing Arrow Up or Arrow Down when the timeline is focused and no article is selected selects the article currently at the top of the viewport and visually indicates selection.
- **FR-006**: With an article selected, Arrow Down selects the next article, scrolls it into view if needed, and marks the previous selection as read upon deselection.
- **FR-007**: With an article selected, Arrow Up selects the previous article if one exists; if none exists, the selection stays on the first article without errors or wrapping.
- **FR-008**: Visual selection state is clearly distinguishable from read/unread state so users can tell which article is currently selected versus read.
- **FR-009**: Keyboard navigation does not trigger when focus is inside form fields or other controls unrelated to the timeline, preventing conflicts with text input.
- **FR-010**: Read-state updates triggered by scroll or selection changes are persisted according to existing read-status rules so that subsequent interactions in the same session reflect the updated state.

### Key Entities *(include if feature involves data)*

- **Article**: Timeline item with identifiers, position in the viewport, read status (read/unread), and selection state.
- **Folder queue**: Navigation control representing folder filters; has anchored position, docked state, and height that affects timeline offset when docked.
- **Timeline viewport state**: Tracks scroll position, focused region, currently selected article, and the top-most visible article used for first-key selection.

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: Maintain existing spacing and typography tokens; validate WCAG 2.1 AA for contrast and ensure keyboard focus order follows visual reading order when using Arrow keys.
- **Responsive Behavior**: Validate screenshots at three states: (1) folder queue in natural position below heading (not scrolled), (2) folder queue docked to top (scrolled past), (3) folder queue unsticking (scrolled back to top). Review diffs to confirm correct docking/unsticking transitions on small screens and remains aligned on large screens.
- **Visual Regression Proof**: Capture before/after screenshots of the timeline with the folder queue docked and with a selected article; review diffs to confirm no unintended layout shifts.
- **Data Loading Strategy**: Preserve current lazy-loading or pagination of timeline items; ensure read-status updates do not trigger extra data loads beyond necessary state persistence.
- **Static Build Strategy**: Document how timeline content appears in static exports (e.g., placeholder or initial data), and how client-side hydration or fetching restores live content; include the commands required to reproduce the static build and confirm the docked queue and selection states render correctly after hydration.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: In usability tests, 95% of users can keep the folder queue visible during long scrolls without manual repositioning.
- **SC-002**: 95% of articles that pass the top edge are marked read within 0.5 seconds while remaining visible until reload.
- **SC-003**: Keyboard-only users can move through 10 consecutive articles using Arrow keys without pointer input, with selections always visible and correct in 100% of test runs.
- **SC-004**: No more than 1% of tested sessions report accidental read-state changes while typing in other controls, indicating correct focus handling for hotkeys.
