---

description: "Task list template for feature implementation"
---

# Tasks: Improve Timeline Article Cards

**Input**: Design documents from `/specs/007-improve-article-cards/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests & Evidence**: The constitution requires right-sized verification for every user story. List the minimal automated tests or manual smoke checks needed for risky flows, call out when no extra verification is necessary, and skip release runbooks or recorded evidence unless a dependency demands it. Remember that features must adhere to the Unread-Only Focus principle—ensure test scenarios verify that read articles are never loaded and are evicted from cache/storage once read state is confirmed or after the next sync, while items just marked as unread may remain until that sync completes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Review current timeline card implementation in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx
- [X] T002 Review timeline data shaping for ArticlePreview in /workspaces/newsboxzero/src/hooks/useFolderQueue.ts
- [X] T003 [P] Review timeline cache schema impacts in /workspaces/newsboxzero/src/lib/storage/timelineCache.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add feedName and author fields to ArticlePreview in /workspaces/newsboxzero/src/types/article.ts
- [X] T005 [P] Populate ArticlePreview.feedName and author in /workspaces/newsboxzero/src/hooks/useFolderQueue.ts
- [X] T006 Update timeline cache merge/prune logic to preserve new fields in /workspaces/newsboxzero/src/lib/storage/timelineCache.ts
- [X] T007 Update preview aggregation helpers to retain feedName/author in /workspaces/newsboxzero/src/lib/utils/unreadAggregator.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Scan article cards (Priority: P1) 🎯 MVP

**Goal**: Show title link, feed name, optional author, age, optional excerpt, and optional thumbnail in collapsed cards.

**Independent Test**: Load a timeline with varied articles and verify metadata line, excerpt omission, and right-side thumbnail placement without triggering expansion on link clicks.

### Tests & Checks for User Story 1 (Right-Sized) ⚠️

- [ ] T008 [US1] Run manual smoke check steps 1-3 in /workspaces/newsboxzero/specs/007-improve-article-cards/quickstart.md

### Implementation for User Story 1

- [X] T009 [US1] Render feed name, optional author, and age line in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx
- [X] T010 [US1] Update collapsed layout to show optional excerpt and right-side thumbnail with responsive stacking in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx
- [X] T011 [US1] Ensure title link opens in new tab and never triggers expansion in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Expand to read full content (Priority: P2)

**Goal**: Expand/collapse cards on click (excluding links), mark as read on expand, and render full content with fallback while keeping expanded cards visible until next sync.

**Independent Test**: Toggle expansion on a single card and verify read marking, full-width thumbnail, and full text or excerpt fallback while multiple cards can remain expanded.

### Tests & Checks for User Story 2 (Right-Sized) ⚠️

- [ ] T012 [US2] Run manual smoke check steps 4-5 in /workspaces/newsboxzero/specs/007-improve-article-cards/quickstart.md
- [X] T013 [US2] Verify unread-only focus behavior against pending read sync in /workspaces/newsboxzero/specs/007-improve-article-cards/spec.md

### Implementation for User Story 2

- [X] T014 [US2] Update expand/collapse click handling to ignore nested links and support keyboard toggling in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx
- [X] T015 [US2] Render expanded header (title + metadata) and full-width thumbnail in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx
- [X] T016 [US2] Render full article body with excerpt fallback in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx
- [X] T017 [US2] Adjust mark-read flow to keep expanded items visible until next sync reconciliation in /workspaces/newsboxzero/src/hooks/useFolderQueue.ts
- [X] T018 [US2] Ensure cache reconciliation evicts read items after sync completes in /workspaces/newsboxzero/src/lib/storage/timelineCache.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T019 [P] Review responsive behavior at 320px and 1440px in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx
- [ ] T020 Validate static build/export remains unchanged for timeline page in /workspaces/newsboxzero/src/app/timeline/page.tsx
- [ ] T021 Run quickstart verification checklist end-to-end in /workspaces/newsboxzero/specs/007-improve-article-cards/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 layout but independently testable

### Within Each User Story

- Manual smoke check steps should be documented before coding
- Data shaping before UI rendering
- UI rendering before interaction refinements
- Story complete before moving to next priority

### Parallel Opportunities

- Foundational tasks T004/T006/T007 can proceed in parallel after T001-T003 review
- Within US1, T009 and T010 can proceed in parallel; T011 follows to validate link behavior
- Within US2, T014/T015/T016 can proceed in parallel; T017/T018 follow to align cache behavior

---

## Parallel Example: User Story 1

```bash
Task: "Render feed name, optional author, and age line in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx"
Task: "Update collapsed layout to show optional excerpt and right-side thumbnail with responsive stacking in /workspaces/newsboxzero/src/components/timeline/ArticleCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
3. Stories complete and integrate independently
