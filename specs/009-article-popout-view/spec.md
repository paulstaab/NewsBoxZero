# Feature Specification: Article Pop-out View

**Feature Branch**: `009-article-popout-view`  
**Created**: 2026-01-23  
**Status**: Draft  
**Input**: User description: "Change the detail article view from expanding to pop out. Instead of expanding articles in the timeline, create a pop out window above the timeline that shows the picture (if available), the heading, subheading, and full text of the article. Include a close button at the top right; clicking outside or swiping it up should close it. The pop out has its own scroll bar and disables timeline interaction while open."

## Clarifications

### Session 2026-01-23

- Q: Should the pop-out support keyboard dismissal (e.g., Escape) and trap focus while open? → A: Trap focus in the pop-out and close on Escape.
- Q: When the pop-out closes, where should keyboard focus return? → A: Return focus to the article that opened the pop-out.
- Q: Should the pop-out dim the background with a visible overlay? → A: Yes, show a dimmed overlay.
- Q: Should the pop-out be closable via the browser Back button (URL state), or should it stay purely in-page? → A: Keep it purely in-page (no URL changes).

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

### User Story 1 - Read article in pop-out (Priority: P1)

As a reader, I want article details to open in a focused pop-out so I can read the full content without losing my place in the timeline.

**Why this priority**: This is the core value of the change: a dedicated, readable detail view that preserves context.

**Independent Test**: Can be fully tested by opening a single article and confirming the pop-out displays all required content.

**Acceptance Scenarios**:

1. **Given** a timeline with articles, **When** I open an article, **Then** a pop-out appears above the timeline showing the image (if available), heading, subheading, and full text.
2. **Given** an article without an image, **When** I open it, **Then** the pop-out shows the heading, subheading, and full text without a broken image area.

---

### User Story 2 - Dismiss the pop-out (Priority: P2)

As a reader, I want multiple easy ways to close the pop-out so I can quickly return to the timeline.

**Why this priority**: Clear dismissal keeps the reading flow smooth and prevents users from feeling trapped.

**Independent Test**: Can be fully tested by opening one pop-out and closing it via each supported interaction.

**Acceptance Scenarios**:

1. **Given** a pop-out is open, **When** I click the close button, **Then** the pop-out closes and the timeline is visible again.
2. **Given** a pop-out is open, **When** I click outside the pop-out window, **Then** the pop-out closes.
3. **Given** a pop-out is open on a touch device, **When** I swipe it up, **Then** the pop-out closes.

---

### User Story 3 - Focused reading without timeline interaction (Priority: P3)

As a reader, I want the pop-out to scroll independently so I can read long articles without the timeline moving or reacting.

**Why this priority**: Preventing accidental timeline interaction improves readability and reduces frustration.

**Independent Test**: Can be fully tested by opening a long article and attempting to interact with the timeline while the pop-out is open.

**Acceptance Scenarios**:

1. **Given** a pop-out is open, **When** I scroll within it, **Then** only the pop-out content scrolls.
2. **Given** a pop-out is open, **When** I attempt to scroll or click the timeline, **Then** no timeline interactions occur.

---

### Edge Cases

- Opening an article with a missing subheading.
- Extremely long article text that requires extended scrolling.
- Rapidly opening different articles while a pop-out is already open.
- Very small screens where the pop-out must still be readable and dismissible.
- Opening an article while offline or with partial content available.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST open a pop-out window above the timeline when a user selects an article.
- **FR-002**: The pop-out MUST display the article image when available and omit the image area when not available.
- **FR-003**: The pop-out MUST display the article heading, subheading, and full text.
- **FR-004**: The pop-out MUST provide its own scrollable area for article content.
- **FR-005**: Users MUST be able to close the pop-out via a top-right close control.
- **FR-006**: Users MUST be able to close the pop-out by clicking outside the window.
- **FR-007**: Users MUST be able to close the pop-out by swiping it upward on touch devices.
- **FR-008**: While the pop-out is open, the timeline MUST not respond to clicks, taps, scrolls, or keyboard navigation.
- **FR-009**: Only one pop-out can be open at a time; opening a new article replaces the current pop-out content.
- **FR-010**: While the pop-out is open, focus MUST be trapped within the pop-out.
- **FR-011**: Users MUST be able to close the pop-out by pressing Escape.
- **FR-012**: When the pop-out closes, focus MUST return to the article that opened it.
- **FR-013**: A dimmed overlay MUST appear behind the pop-out while it is open.
- **FR-014**: Opening or closing the pop-out MUST NOT change the browser URL or history state.

### Key Entities *(include if feature involves data)*

- **Article**: The content being displayed, including heading, subheading, body text, and optional image.
- **Pop-out Window**: The focused detail view state tied to a single article, including open/closed status.
- **Overlay Area**: The background region that captures outside clicks to dismiss the pop-out.

## Assumptions

- Article content is available when the pop-out is opened, or a clear loading state is shown until it is.
- Swipe-to-close applies to touch-capable devices; non-touch devices rely on click or button dismissal.
- The pop-out is a single, focused window (no split or multi-article view).

## Out of Scope

- Editing, annotating, or sharing article content from the pop-out.
- Changes to how the timeline itself is organized or filtered.

## Dependencies

- Access to the same article content already presented in the timeline.
- Existing interaction patterns for opening an article from the timeline.

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: Use the existing visual language (spacing, typography, and component styles). Validate WCAG 2.1 AA contrast and keyboard paths for focus trapping within the pop-out, Escape dismissal, and restoring focus to the opening article.
- **Responsive Behavior**: Support widths from 320px to 1440px. On small screens, the pop-out uses near-full width with safe margins; on large screens, it is centered with a readable maximum width. The close control remains visible in all sizes.
- **Visual Regression Proof**: Update the existing visual regression coverage to include the timeline with the pop-out open and closed, and review diffs against the current baseline.
- **Data Loading Strategy**: Reuse the article data already available from the timeline. If any field is missing, the pop-out should display a clear absence state without adding new data retrieval steps.
- **Static Build Strategy**: The default static view shows the timeline without an open pop-out. The pop-out appears only after user interaction, using the same content source as the timeline.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of users can open an article and view the full content in the pop-out on the first attempt in usability testing.
- **SC-002**: 100% of timeline interaction attempts are blocked while the pop-out is open in QA validation.
- **SC-003**: The pop-out can be dismissed via button, outside click, and swipe in 100% of test cases.
- **SC-004**: 90% of users can close the pop-out and return to the same timeline position within 5 seconds.
