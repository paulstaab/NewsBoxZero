---

description: "Task list for Article Pop-out View"
---

# Tasks: Article Pop-out View

**Input**: Design documents from /specs/009-article-popout-view/
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests & Evidence**: Right-sized verification for modal behavior includes unit coverage for core open/close flows plus manual smoke checks for swipe, focus restore, and scroll lock. No release runbooks or recordings required.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared UI building blocks used across stories

- [x] T001 [P] Create pop-out component shell in src/components/timeline/ArticlePopout.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state management needed for all user stories

- [x] T002 Create pop-out state + focus restore hook in src/hooks/useArticlePopout.ts
- [x] T003 Update selection plumbing to expose selected article + opener element in src/hooks/useTimelineSelection.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Read article in pop-out (Priority: P1) 🎯 MVP

**Goal**: Show article details in a modal pop-out using existing timeline data.

**Independent Test**: Open one article and confirm image (if present), heading, subheading, and full text render in the pop-out.

### Tests & Checks for User Story 1 (Right-Sized)

- [x] T004 [P] [US1] Add unit test for pop-out content rendering in tests/unit/components/articlePopout.test.tsx

### Implementation for User Story 1

- [x] T005 [P] [US1] Implement pop-out content layout + scroll container in src/components/timeline/ArticlePopout.tsx
- [x] T006 [US1] Wire pop-out open/render flow in src/components/timeline/TimelineList.tsx
- [x] T007 [US1] Ensure timeline page passes selected article data to pop-out in src/app/timeline/page.tsx

**Checkpoint**: User Story 1 is independently functional

---

## Phase 4: User Story 2 - Dismiss the pop-out (Priority: P2)

**Goal**: Provide close controls (button, overlay click, Escape, swipe) and restore focus.

**Independent Test**: Open a pop-out and close it via each supported interaction, then confirm focus returns to the opening article.

### Tests & Checks for User Story 2 (Right-Sized)

- [x] T008 [P] [US2] Add unit test for close interactions (button + overlay + Escape) in tests/unit/components/articlePopout.test.tsx

### Implementation for User Story 2

- [x] T009 [US2] Add overlay + close button handlers in src/components/timeline/ArticlePopout.tsx
- [x] T010 [US2] Implement focus trap + Escape handling in src/hooks/useArticlePopout.ts
- [x] T011 [US2] Add swipe-to-dismiss hook in src/hooks/useSwipeDismiss.ts and integrate in src/components/timeline/ArticlePopout.tsx

**Checkpoint**: User Story 2 is independently functional

---

## Phase 5: User Story 3 - Focused reading without timeline interaction (Priority: P3)

**Goal**: Ensure the pop-out scrolls independently and blocks timeline interaction while open.

**Independent Test**: Open a long article, scroll the pop-out, and verify the timeline does not scroll or respond to clicks/keys.

### Tests & Checks for User Story 3 (Right-Sized)

- [x] T012 [US3] Document manual scroll-lock verification steps in specs/009-article-popout-view/quickstart.md

### Implementation for User Story 3

- [x] T013 [US3] Lock background scroll + disable timeline pointer events in src/app/timeline/page.tsx
- [x] T014 [US3] Add overscroll containment for pop-out scroll area in src/components/timeline/ArticlePopout.tsx

**Checkpoint**: User Story 3 is independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T015 [P] Update visual regression notes in docs/metrics/bundle.md when UI changes affect snapshots
- [x] T016 [P] Validate quickstart steps in specs/009-article-popout-view/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on completion of desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2
- **User Story 2 (P2)**: Depends on Phase 2
- **User Story 3 (P3)**: Depends on Phase 2

### Parallel Opportunities

- T001, T004, T008, T015, T016 can run in parallel (distinct files)
- T005 and T006 can run in parallel after T002/T003
- User stories can be developed in parallel once Phase 2 is complete

---

## Parallel Example: User Story 1

- T004 [P] [US1] Add unit test for pop-out content rendering in tests/unit/components/articlePopout.test.tsx
- T005 [P] [US1] Implement pop-out content layout + scroll container in src/components/timeline/ArticlePopout.tsx

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (User Story 1)
3. Validate User Story 1 independently using its test and manual checks

### Incremental Delivery

1. Deliver User Story 1 (MVP)
2. Add User Story 2 dismissal behaviors
3. Add User Story 3 scroll/interaction isolation
4. Finish Polish tasks
