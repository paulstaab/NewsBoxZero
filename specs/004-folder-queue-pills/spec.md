# Feature Specification: Folder Queue Pills

**Feature Branch**: `004-folder-queue-pills`  
**Created**: 2025-12-28  
**Status**: Draft  
**Input**: User description: "Display the folder queue on the timeline page instead of the current Unread and All pills. It should be a horizontal squence of pills showing the folder name and the number of unread articles in parentes behind it. Example: Tech News (15). The folders should be sorted initially by number of unread articles highest to lowests. Folders with no unread articles should not be shown. Both Marking all articles as read should remove the current folders pill from the folder list. Skipping should add the folder pill again at the end of the queue. Reloading should again sort the folder queue be number of unread articles highest to loweset. The first folder should always be the currently selected folder, and should be highlighted. only articles from the currently selected folder should be shown. Folder pills should
be clickable. When clickling on a folder pill, this folder should move to the top of the folder queue and become the active folder. Article of this folder should be displayed."

## Clarifications

### Session 2025-12-28

- Q: What should the timeline show when there are no folders with unread articles? → A: Show an empty state with no folder pills and no articles shown.
- Q: What should happen when the selected folder becomes empty? → A: Auto-select the next folder in the queue.
- Q: How should ties be handled when unread counts are equal? → A: Preserve existing order among ties (stable order).
- Q: How should selection behave when unread counts update? → A: Keep the current selection until the user changes it or it becomes empty.
- Q: After skipping, where should the folder reappear in the queue? → A: It always goes to the end, regardless of unread count.
- Q: When clicking a folder pill, how should the rest of the queue be ordered? → A: Move the clicked folder to the first position and keep the rest of the queue order unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Focus on unread folders (Priority: P1)

As a reader, I want the timeline to show a queue of folders with unread counts so I can focus on the folders that need attention.

**Why this priority**: It is the primary navigation change and replaces the existing Unread/All pills.

**Independent Test**: Can be fully tested by loading the timeline and verifying the pill list contents and ordering based on unread counts.

**Acceptance Scenarios**:

1. **Given** multiple folders with unread articles, **When** the timeline loads, **Then** the pills show each folder name with unread count in parentheses, sorted by unread count descending, excluding folders with zero unread.
2. **Given** a current folder is set, **When** the timeline loads, **Then** the first pill matches the current folder and is visually highlighted.
3. **Given** a folder pill is clicked, **When** the queue updates, **Then** the clicked folder becomes the first pill and the remaining order is unchanged.

---

### User Story 2 - Read and skip update the queue (Priority: P2)

As a reader, I want marking all as read or skipping to update the folder queue so the pills reflect what still needs reading.

**Why this priority**: It keeps the queue accurate as I process folders.

**Independent Test**: Can be fully tested by using Mark All as Read and Skip and verifying changes to the pill list order and membership.

**Acceptance Scenarios**:

1. **Given** the current folder has unread articles, **When** I mark all as read, **Then** its pill is removed from the queue if its unread count becomes zero.
2. **Given** I skip the current folder, **When** the action completes, **Then** its pill moves to the end of the queue and remains visible if it still has unread articles.

---

### User Story 3 - Filtered articles view (Priority: P3)

As a reader, I want only articles from the selected folder to appear so the timeline matches the queue selection.

**Why this priority**: It ensures the queue drives the content displayed.

**Independent Test**: Can be fully tested by selecting a folder pill and verifying only that folder's articles are shown.

**Acceptance Scenarios**:

1. **Given** a folder pill is selected, **When** the timeline renders, **Then** only articles from that folder are shown.

---

### Edge Cases

- When there are no folders with unread articles, the timeline shows an empty state with no folder pills and no articles.
- When the current folder becomes empty while it is selected, the system auto-selects the next folder in the queue.
- When unread counts tie, the queue preserves existing order among tied folders.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The timeline page MUST replace the current Unread and All pills with a horizontal sequence of folder pills.
- **FR-002**: Each folder pill MUST display the folder name and unread count in parentheses (e.g., "Tech News (15)").
- **FR-003**: The initial folder queue MUST be sorted by unread count descending, excluding folders with zero unread articles.
- **FR-004**: The first pill MUST represent the currently selected folder and MUST be visually highlighted.
- **FR-005**: Only articles from the currently selected folder MUST be shown in the timeline.
- **FR-006**: When all articles in the selected folder are marked as read, the folder pill MUST be removed from the queue if its unread count becomes zero.
- **FR-007**: When the user skips the selected folder, that folder pill MUST be added to the end of the queue (if it still has unread articles).
- **FR-008**: On reload, the queue MUST be rebuilt and re-sorted by unread count descending, excluding folders with zero unread articles.
- **FR-009**: The selected folder MUST always remain the first pill in the queue while it has unread articles.
- **FR-010**: When there are no folders with unread articles, the timeline MUST show no folder pills and no articles.
- **FR-011**: When the selected folder's unread count becomes zero, the next available folder in the queue MUST become selected.
- **FR-012**: When unread counts are equal, the queue MUST preserve the existing order among tied folders.
- **FR-013**: Changes in unread counts MUST NOT change the selected folder unless the selected folder becomes empty.
- **FR-014**: When a folder is skipped, it MUST be placed at the end of the queue regardless of unread count until the next reload re-sorts the queue.
- **FR-015**: When a folder pill is clicked, that folder MUST become the selected folder and move to the first position while the rest of the queue order remains unchanged.

### Key Entities *(include if feature involves data)*

- **Folder**: A collection of articles with a name and an unread article count.
- **Folder Queue**: The ordered list of folders with unread articles shown as pills on the timeline.
- **Selected Folder**: The active folder whose articles are displayed.
- **Article**: An item that belongs to a folder and can be unread or read.

## Experience & Performance Standards *(mandatory)*

- **UX Consistency**: Use existing spacing and typography conventions for pills; verify contrast and keyboard navigation meet WCAG 2.1 AA.
- **Responsive Behavior**: Support a single-row horizontal pill list with horizontal overflow handling from 320px to 1440px; at narrow widths, ensure the selected pill remains visible.
- **Visual Regression Proof**: Capture before/after screenshots of the timeline with multiple folder pills, a single pill, and no pills; review diffs for pill ordering, selection highlight, and empty states.
- **Data Loading Strategy**: Use existing unread counts already available for the timeline to populate the queue; avoid additional data fetches beyond current timeline loading behavior.
- **Static Build Strategy**: Use the same data sourcing approach as the current timeline; if data is unavailable at build time, the queue renders empty until client data loads.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of users can identify the top unread folder within 5 seconds of opening the timeline.
- **SC-002**: Switching folders results in the timeline showing only that folder's articles on the first attempt in 95% of test sessions.
- **SC-003**: The queue reflects read/skip actions with correct ordering and membership in 100% of acceptance tests.
- **SC-004**: The feature does not increase timeline load time by more than 10% compared to the current view.

## Assumptions

- The current folder selection already exists and can be used to place the selected folder first.
- Skipping does not mark articles as read, so unread counts remain unchanged for the skipped folder.
- When the selected folder is removed due to zero unread, selection moves to the next available folder if any exist.
