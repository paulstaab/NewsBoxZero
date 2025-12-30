# Feature Specification: Improve Timeline Article Cards

**Feature Branch**: `[007-improve-article-cards]`  
**Created**: 2025-12-30  
**Status**: Draft  
**Input**: User description: "Improve the article cards in the timeline. Each card should contain the title with link to the article (opening in a new tab) on top. below it should be a line with Feedname (e.g. `tagesschau.de`) followed by article author in parenteses if provided, e.g. `(Franz)` followed by a dot and the age of the article (`25m ago`). Below that should be the excerpt if provided. If provided display the thumbnail at the right side of the article card. clickling on the article card - anywhere but on links - should expand the article card. In expanded view, Title plus subheading (again feedname, potentially author and article age) should be at the top, potentially the thumbnail below it with full width, and then the full text content if provided with the except as fallback. Expanding the article should also mark it as read, but still display the expanded article for the user to read until the next sync. Clicking on it again should un-expand it."

## Clarifications

### Session 2025-12-30

- Q: Should multiple article cards be allowed to stay expanded at the same time? → A: Multiple cards can be expanded independently.

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

### User Story 1 - Scan article cards (Priority: P1)

As a reader, I want timeline cards to show the title, source, author (if any), age, excerpt, and thumbnail (if any) so I can decide what to open quickly.

**Why this priority**: This is the primary browsing experience and delivers immediate value even without expansion.

**Independent Test**: Can be fully tested by loading a timeline with varied articles and verifying the card layout and metadata display.

**Acceptance Scenarios**:

1. **Given** a timeline item with title, feed name, author, age, excerpt, and thumbnail, **When** the card is displayed, **Then** the title appears as a link at the top, the metadata line shows "Feedname (Author). Age", the excerpt appears below, and the thumbnail appears to the right of the card content.
2. **Given** a timeline item without an author, **When** the card is displayed, **Then** the metadata line shows only "Feedname. Age" without parentheses.
3. **Given** a timeline item without excerpt or thumbnail, **When** the card is displayed, **Then** the excerpt and thumbnail are omitted without leaving empty placeholders.
4. **Given** a user clicks the title link, **When** the article opens, **Then** it opens in a new tab and the card does not expand or collapse.

---

### User Story 2 - Expand to read full content (Priority: P2)

As a reader, I want to expand a card by clicking it (excluding links) to read the full content and mark it as read, and collapse it by clicking again.

**Why this priority**: This adds depth for users who want to read inline without leaving the timeline.

**Independent Test**: Can be fully tested by toggling expansion on a single card and verifying content, layout, and read status changes.

**Acceptance Scenarios**:

1. **Given** a collapsed card, **When** the user clicks anywhere on the card except links, **Then** the card expands and is marked as read.
2. **Given** an expanded card, **When** the user clicks anywhere on the card except links, **Then** the card collapses and remains marked as read.
3. **Given** an expanded card with a thumbnail, **When** it renders, **Then** the thumbnail appears below the title and metadata at full card width.
4. **Given** an expanded card with full text content, **When** it renders, **Then** the full text is shown; if full text is missing, the excerpt is shown as fallback.
5. **Given** a card is expanded and marked read, **When** the next sync has not yet occurred, **Then** the expanded view remains visible for reading.
6. **Given** multiple cards in the timeline, **When** a user expands one card and then expands another, **Then** both cards remain expanded.

---

### Edge Cases
- Cards with very long titles or metadata should remain readable without overlapping the thumbnail.
- Articles without any excerpt or full text should still expand, showing title and metadata without blank content blocks.
- Clicking nested links inside expanded content should open the link without collapsing the card.
- Rapid repeated clicks should toggle expansion without leaving the card in an inconsistent state.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST render each timeline card with the article title as a clickable link at the top.
- **FR-002**: System MUST open the title link in a new browser tab when clicked.
- **FR-003**: System MUST display a metadata line below the title in the format "Feedname (Author). Age" when author is present, and "Feedname. Age" when author is absent.
- **FR-004**: System MUST display the article excerpt below the metadata line when an excerpt is available.
- **FR-005**: System MUST display the thumbnail on the right side of a collapsed card when a thumbnail is available.
- **FR-006**: System MUST expand a card when the user clicks anywhere on the card except links, and MUST collapse it when clicked again.
- **FR-007**: System MUST mark the article as read at the moment the card expands.
- **FR-008**: System MUST keep the expanded card visible after it is marked read until the next timeline sync occurs.
- **FR-009**: System MUST display, in expanded view, the title and metadata at the top, followed by a full-width thumbnail when available.
- **FR-010**: System MUST display full text content in the expanded view when available, and MUST fall back to the excerpt when full text is unavailable.
- **FR-011**: System MUST allow multiple cards to remain expanded simultaneously; expanding one card MUST NOT collapse others.

### Key Entities *(include if feature involves data)*

- **Article**: Represents a timeline item with title, feed name, author (optional), publication age, excerpt (optional), full text (optional), thumbnail (optional), and read status.
- **Timeline Card**: A visual representation of an article with collapsed/expanded state and the associated display rules.

## Assumptions

- Relative age text uses the app's existing human-readable format (for example, minutes or hours ago).
- Feed name is already available in timeline data and requires no user input.
- If both excerpt and full text are missing, the expanded view still shows title and metadata without a placeholder body.

## Dependencies

- Timeline data already includes title, feed name, age, excerpt/full text, thumbnail, and read status fields.
- Existing sync behavior remains the trigger for refreshing timeline read states.

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: Align card typography, spacing, and hierarchy with existing timeline styles; validate readable contrast and keyboard navigation for links and card focus states against WCAG 2.1 AA.
- **Responsive Behavior**: Support widths from 320px to 1440px; in narrow layouts, allow the thumbnail to stack below text in collapsed view while preserving right-side placement on wider screens; expanded view shows the thumbnail full width when present.
- **Visual Regression Proof**: Capture before/after screenshots of timeline cards in collapsed and expanded states, including cases with and without thumbnails and excerpts; review diffs with the standard visual review process.
- **Data Loading Strategy**: Use the existing timeline data and available fields only; no additional feed requests are introduced beyond current sync behavior.
- **Static Build Strategy**: Rely on the same data sources and build steps currently used for timeline rendering; the page should render with available static data and refresh to the current timeline state without new build-time requirements.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: In usability testing, at least 90% of participants can identify the article source and age from a card within 5 seconds.
- **SC-002**: 100% of title link clicks open the article in a new tab without triggering expansion or collapse.
- **SC-003**: At least 95% of expanded cards display readable body content, using full text when available and excerpt as fallback.
- **SC-004**: At least 90% of participants can expand and collapse a card on first attempt without assistance.
