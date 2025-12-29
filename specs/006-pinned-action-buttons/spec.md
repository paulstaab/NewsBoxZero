# Feature Specification: Pinned Action Buttons

**Feature Branch**: `006-pinned-action-buttons`  
**Created**: 2025-12-29  
**Status**: Draft  
**Input**: User description: "Please add three buttons that are always pinned to the botton right corner of the window. They should be aligned in an vertical line, the lowest being Mark All Read right at the botton, above it Skip and above it Sync. They should only show pictograms: Mark all read: fa-check-double, Skip: fa-forward-step, Sync: fa-rotate. If all articles are read, Skip and Mark all Read should be greyed out and not clickable, but remain there for visiual stability. Also use these pictograms for the existing buttons. Move / add additional buttons so that be have skip and mark all read both above and below the articles, aligned right. Move the Sync button right of the Timeline heading to the right side of the screen, replacing the current All caught up / unread article and folder count."

## Clarifications

### Session 2025-12-29

- Q: When the viewport is narrow and the pinned cluster could overlap timeline content, what behavior should we enforce? → A: Allow overlap; content can sit under the pinned buttons.
- Q: Should the icon-only action buttons include accessible labels and/or tooltips? → A: Add aria-label plus a hover tooltip (icon stays textless).
- Q: Should “Sync” remain available even when all articles are read? → A: Yes, Sync is always enabled.
- Q: When the “All caught up / unread article and folder count” summary is displaced by Sync in the header, where should that summary go? → A: Remove it entirely.
- Q: Should disabled Skip/Mark All Read controls block keyboard activation (e.g., Enter/Space) and pointer clicks? → A: Yes, fully non-interactive (no click or keyboard activation).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Always-available actions (Priority: P1)

As a reader, I can access Sync, Skip, and Mark All Read from a fixed control cluster so I can act quickly without scrolling or hunting for buttons.

**Why this priority**: These are the primary timeline actions and must be reachable at all times.

**Independent Test**: Can be fully tested by opening the timeline and verifying the pinned controls remain visible and usable while scrolling.

**Acceptance Scenarios**:

1. **Given** the timeline is visible, **When** I scroll anywhere in the list, **Then** the pinned action cluster remains fixed in the bottom-right corner with Sync above Skip above Mark All Read.
2. **Given** the timeline is visible, **When** I look at the pinned cluster, **Then** each control is represented by its specified pictogram with no text label.

---

### User Story 2 - Read-state aware actions (Priority: P2)

As a reader, I see Skip and Mark All Read disabled when there is nothing unread so I avoid pointless actions while keeping the layout stable.

**Why this priority**: Prevents confusing no-op actions and keeps the UI predictable.

**Independent Test**: Can be fully tested by switching between all-read and not-all-read states and observing control states.

**Acceptance Scenarios**:

1. **Given** all articles are already read, **When** I view the action controls, **Then** Skip and Mark All Read appear greyed out and cannot be clicked while remaining visible.
2. **Given** there is at least one unread article, **When** I view the action controls, **Then** Skip and Mark All Read are enabled and clickable.

---

### User Story 3 - Action access near content (Priority: P3)

As a reader, I can use Skip and Mark All Read both above and below the articles so I can act without scrolling far.

**Why this priority**: Reduces effort when I reach the top or bottom of the list.

**Independent Test**: Can be fully tested by viewing the timeline and confirming the actions appear in both positions aligned to the right.

**Acceptance Scenarios**:

1. **Given** I am at the top of the article list, **When** I look above the articles, **Then** Skip and Mark All Read appear aligned to the right.
2. **Given** I am at the bottom of the article list, **When** I look below the articles, **Then** Skip and Mark All Read appear aligned to the right.

---

### Edge Cases

- When the window is narrow, the pinned buttons are allowed to overlap content; no padding or repositioning is required.
- How does the system handle the transition from unread to all-read while the user is actively interacting with the buttons?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a pinned vertical action cluster in the bottom-right corner with Sync on top, Skip in the middle, and Mark All Read at the bottom.
- **FR-002**: The pinned action cluster MUST use pictograms only: Sync uses rotate, Skip uses forward-step, and Mark All Read uses double-check.
- **FR-003**: The system MUST present Skip and Mark All Read controls above and below the article list, aligned to the right.
- **FR-004**: When all articles are read, the system MUST render Skip and Mark All Read as disabled (greyed out, non-clickable) while keeping them visible.
- **FR-005**: When at least one article is unread, the system MUST render Skip and Mark All Read as enabled and clickable.
- **FR-006**: The Sync control MUST appear at the right side of the timeline heading area, replacing the current status summary location.
- **FR-007**: The existing Skip and Mark All Read controls MUST be updated to use the same pictograms as the pinned controls.
- **FR-008**: Icon-only action controls MUST include an aria-label and a hover tooltip while keeping icons textless in the UI.
- **FR-009**: The Sync control MUST remain enabled regardless of the read/unread state.
- **FR-010**: Disabled Skip and Mark All Read controls MUST not respond to pointer or keyboard activation.

### Key Entities *(include if feature involves data)*

- **Article**: Represents an item in the timeline with a read/unread status.
- **Timeline status**: Represents whether the timeline contains unread items and drives enable/disable behavior.

### Assumptions

- The meaning and behavior of Sync, Skip, and Mark All Read remain unchanged; only placement, visibility, and iconography are updated.
- The timeline no longer displays the status summary once it is removed from the heading area.

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: Define spacing, typography, and icon sizing rules for the pinned cluster and in-list controls, and verify contrast and keyboard access meet WCAG 2.1 AA expectations.
- **Accessibility Labels**: Provide aria-labels and hover tooltips for icon-only controls without introducing visible text labels.
- **Responsive Behavior**: Ensure the controls remain usable from 320px to 1440px widths, allowing the pinned cluster to overlap list content on narrow layouts.
- **Visual Regression Proof**: Capture before/after UI snapshots for the timeline header, pinned cluster, and top/bottom list controls, and review diffs in the existing visual regression process.
- **Data Loading Strategy**: No additional data loads are introduced; controls rely on the existing read/unread state already available in the timeline view.
- **Static Build Strategy**: The feature uses the same pre-rendered timeline data and client-side state as before, with no new data sources required for static export.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of timeline views show the pinned action cluster in the bottom-right corner with correct ordering and icons.
- **SC-002**: In all-read states, 100% of Skip and Mark All Read controls are visibly disabled and do not respond to click/tap.
- **SC-003**: In not-all-read states, 100% of Skip and Mark All Read controls are enabled and respond to click/tap.
- **SC-004**: Users can reach any of the three actions without scrolling in under 2 seconds in a usability check with five participants.
