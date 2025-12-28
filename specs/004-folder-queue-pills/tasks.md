---

description: "Task list for Folder Queue Pills"
---

# Tasks: Folder Queue Pills

**Input**: Design documents from `/specs/004-folder-queue-pills/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests & Evidence**: The constitution requires right-sized verification for every user story. Add minimal automated tests for queue ordering, selection, skip/mark-all behaviors, and filtered timeline rendering; rely on manual checks only for responsive layout and screenshot capture. Ensure unread-only behavior is validated by tests that confirm read items are removed from cache and never rendered.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create scaffold pill component file in src/components/timeline/FolderQueuePills.tsx
- [X] T002 [P] Align folder queue/pill types in src/types/folder.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Add queue ordering helpers (active pin, stable ties, skip-to-end) in src/lib/utils/unreadAggregator.ts
- [X] T004 Update cache persistence for activeFolderId/sortOrder and zero-unread pruning in src/lib/storage/timelineCache.ts
- [X] T005 Update queue state derivation and action API in src/hooks/useFolderQueue.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Focus on unread folders (Priority: P1) 🎯 MVP

**Goal**: Replace Unread/All pills with a folder queue pill strip that shows unread counts, ordered correctly, and supports direct selection.

**Independent Test**: Load the timeline with multiple unread folders and verify pills render with counts, correct ordering, and active selection highlighting.

### Tests & Checks for User Story 1 (Right-Sized) ⚠️

- [X] T006 [P] [US1] Add ordering/active-pin unit tests in tests/unit/unreadAggregator.test.ts
- [X] T007 [US1] Add selection and move-to-top hook tests in tests/hooks/useFolderQueue.test.ts
- [X] T008 [US1] Add pill render/order/selection Playwright coverage in tests/e2e/folder-queue-pills.spec.ts

### Implementation for User Story 1

- [X] T009 [US1] Implement pill strip layout, styles, and a11y states in src/components/timeline/FolderQueuePills.tsx
- [X] T010 [US1] Replace Unread/All pills with FolderQueuePills in src/app/timeline/page.tsx
- [X] T011 [US1] Update or retire legacy pill logic in src/components/timeline/FolderStepper.tsx
- [X] T012 [US1] Wire pill click selection + scroll-into-view in src/components/timeline/FolderQueuePills.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Read and skip update the queue (Priority: P2)

**Goal**: Ensure mark-all-read and skip actions update the queue membership and ordering.

**Independent Test**: Use Mark All as Read and Skip to confirm the queue removes or reorders the active folder appropriately.

### Tests & Checks for User Story 2 (Right-Sized) ⚠️

- [X] T013 [US2] Add mark-all-read and skip queue tests in tests/hooks/useFolderQueue.test.ts
- [X] T014 [US2] Add mark-all/skip Playwright coverage in tests/e2e/folder-queue-pills.spec.ts

### Implementation for User Story 2

- [X] T015 [US2] Implement mark-all-read removal + auto-select-next in src/hooks/useFolderQueue.ts
- [X] T016 [US2] Implement skip-to-end behavior with stable ordering in src/hooks/useFolderQueue.ts
- [X] T017 [US2] Wire mark-all/skip UI handlers to queue actions in src/components/timeline/TimelineList.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Filtered articles view (Priority: P3)

**Goal**: Ensure the timeline list only shows articles from the selected folder.

**Independent Test**: Select a different folder pill and verify only that folder's articles render.

### Tests & Checks for User Story 3 (Right-Sized) ⚠️

- [X] T018 [P] [US3] Add active-folder filtering tests in tests/hooks/useItems.test.ts
- [X] T019 [US3] Add filtered timeline Playwright coverage in tests/e2e/folder-queue-pills.spec.ts

### Implementation for User Story 3

- [X] T020 [US3] Filter items by activeFolderId in src/hooks/useItems.ts
- [X] T021 [US3] Consume filtered items in src/components/timeline/TimelineList.tsx

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T022 [P] Capture timeline screenshots for multi/single/empty pill states in tests/e2e/screenshots/folder-queue-pills/
- [ ] T023 Update manual smoke checklist if needed in specs/004-folder-queue-pills/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2)

### Dependency Graph (User Story Completion Order)

- US1 → US2 → US3 (priority order for delivery)

---

## Parallel Execution Examples

### Parallel Example: User Story 1

```text
T006 [US1] Add ordering/active-pin unit tests in tests/unit/unreadAggregator.test.ts
T009 [US1] Implement pill strip layout, styles, and a11y states in src/components/timeline/FolderQueuePills.tsx
T010 [US1] Replace Unread/All pills with FolderQueuePills in src/app/timeline/page.tsx
```

### Parallel Example: User Story 2

```text
T013 [US2] Add mark-all-read and skip queue tests in tests/hooks/useFolderQueue.test.ts
T017 [US2] Wire mark-all/skip UI handlers to queue actions in src/components/timeline/TimelineList.tsx
```

### Parallel Example: User Story 3

```text
T018 [US3] Add active-folder filtering tests in tests/hooks/useItems.test.ts
T020 [US3] Filter items by activeFolderId in src/hooks/useItems.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo
3. Add User Story 2 → Test independently → Demo
4. Add User Story 3 → Test independently → Demo
5. Polish and cross-cutting updates
