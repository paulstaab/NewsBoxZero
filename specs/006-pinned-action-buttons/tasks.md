---

description: "Task list for pinned action buttons implementation"
---

# Tasks: Pinned Action Buttons

**Input**: Design documents from `/specs/006-pinned-action-buttons/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests & Evidence**: Manual smoke checks in `/workspaces/newsboxzero/specs/006-pinned-action-buttons/quickstart.md` cover all stories (UI placement, disabled state, tooltips, and responsiveness). No new automated tests are required because changes are presentational and rely on existing state; keep verification focused on UI behavior and accessibility. Ensure unread-only behavior remains unchanged (no read items displayed or retained).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared UI assets used across all action placements

- [X] T001 Create action icon components for Sync/Skip/Mark All Read in `/workspaces/newsboxzero/src/components/timeline/TimelineActionIcons.tsx`
- [X] T002 [P] Create reusable icon-only action button with tooltip + aria-label support in `/workspaces/newsboxzero/src/components/timeline/TimelineActionButton.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared configuration for consistent action labeling

- [X] T003 Create action metadata map (labels/tooltips/icons) in `/workspaces/newsboxzero/src/components/timeline/timelineActionConfig.ts`

**Checkpoint**: Shared action assets ready for all stories

---

## Phase 3: User Story 1 - Always-available actions (Priority: P1) 🎯 MVP

**Goal**: Provide a pinned, icon-only action cluster and move Sync into the header’s right edge.

**Independent Test**: Scroll the timeline and confirm the pinned cluster stays fixed with correct icon order; confirm Sync appears on the header right and the status summary is removed.

### Tests & Checks for User Story 1 (Right-Sized)

- [ ] T004 [US1] Validate pinned cluster placement and icons per `/workspaces/newsboxzero/specs/006-pinned-action-buttons/quickstart.md`

### Implementation for User Story 1

- [X] T005 [P] [US1] Build pinned action cluster component in `/workspaces/newsboxzero/src/components/timeline/PinnedActionCluster.tsx`
- [X] T006 [US1] Mount pinned cluster and handlers in `/workspaces/newsboxzero/src/app/timeline/page.tsx`
- [X] T007 [P] [US1] Replace header summary with icon-only Sync on the right in `/workspaces/newsboxzero/src/components/timeline/FolderStepper.tsx`

**Checkpoint**: Pinned cluster + header Sync are functional and scroll-stable

---

## Phase 4: User Story 2 - Read-state aware actions (Priority: P2)

**Goal**: Disable Skip and Mark All Read when there are no unread items while keeping Sync enabled.

**Independent Test**: Toggle between all-read and unread states and verify disabled/enabled controls match requirements.

### Tests & Checks for User Story 2 (Right-Sized)

- [ ] T008 [US2] Validate disabled/enabled behavior per `/workspaces/newsboxzero/specs/006-pinned-action-buttons/quickstart.md`

### Implementation for User Story 2

- [X] T009 [US2] Derive `allRead`/`hasUnread` state in `/workspaces/newsboxzero/src/app/timeline/page.tsx`
- [X] T010 [P] [US2] Apply disabled state + aria-disabled to pinned cluster buttons in `/workspaces/newsboxzero/src/components/timeline/PinnedActionCluster.tsx`
- [X] T011 [P] [US2] Update Mark All Read icon-only button to honor disabled state in `/workspaces/newsboxzero/src/components/timeline/MarkAllReadButton.tsx`
- [X] T012 [US2] Enforce pointer/keyboard lockout for disabled list actions in `/workspaces/newsboxzero/src/components/timeline/TimelineList.tsx`

**Checkpoint**: Disabled state is consistent across pinned + list actions

---

## Phase 5: User Story 3 - Action access near content (Priority: P3)

**Goal**: Provide Skip and Mark All Read controls above and below the article list, aligned right, using the same icons.

**Independent Test**: Confirm top and bottom action rows are visible, right-aligned, and icon-only.

### Tests & Checks for User Story 3 (Right-Sized)

- [ ] T013 [US3] Validate top/bottom action rows per `/workspaces/newsboxzero/specs/006-pinned-action-buttons/quickstart.md`

### Implementation for User Story 3

- [X] T014 [US3] Convert top action row to icon-only, right-aligned controls in `/workspaces/newsboxzero/src/components/timeline/TimelineList.tsx`
- [X] T015 [US3] Add bottom action row with the same controls in `/workspaces/newsboxzero/src/components/timeline/TimelineList.tsx`
- [X] T016 [US3] Ensure Skip/Mark All Read reuse shared icon/tooltip config in `/workspaces/newsboxzero/src/components/timeline/TimelineList.tsx`

**Checkpoint**: Top and bottom action rows are both functional and aligned

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual regression and final runbook confirmation

- [ ] T017 [P] Update visual regression snapshots for header + action rows in `/workspaces/newsboxzero/tests/visual/timeline-folders.spec.ts`
- [ ] T018 Run the full manual verification checklist in `/workspaces/newsboxzero/specs/006-pinned-action-buttons/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependencies
- **User Story 2 (P2)**: Can start after User Story 1 (uses pinned cluster wiring)
- **User Story 3 (P3)**: Can start after User Story 1 (reuses shared action UI)

### Dependency Graph (Story Order)

- US1 → US2 → US3

---

## Parallel Execution Examples

### User Story 1

```bash
Task: "Build pinned action cluster component in /workspaces/newsboxzero/src/components/timeline/PinnedActionCluster.tsx"
Task: "Replace header summary with icon-only Sync on the right in /workspaces/newsboxzero/src/components/timeline/FolderStepper.tsx"
```

### User Story 2

```bash
Task: "Apply disabled state + aria-disabled to pinned cluster buttons in /workspaces/newsboxzero/src/components/timeline/PinnedActionCluster.tsx"
Task: "Update Mark All Read icon-only button to honor disabled state in /workspaces/newsboxzero/src/components/timeline/MarkAllReadButton.tsx"
```

### User Story 3

```bash
# No safe parallel tasks: all changes touch /workspaces/newsboxzero/src/components/timeline/TimelineList.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate via `/workspaces/newsboxzero/specs/006-pinned-action-buttons/quickstart.md`

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Validate → Demo MVP
3. Add User Story 2 → Validate → Demo
4. Add User Story 3 → Validate → Demo
5. Finish Polish tasks
