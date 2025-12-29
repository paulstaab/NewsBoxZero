---

description: "Task list for Article Sync Read Status"
---

# Tasks: Article Sync Read Status

**Input**: Design documents from `/specs/005-article-sync-readstatus/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests & Evidence**: Automated tests are not explicitly requested in the spec. Manual verification steps in `/workspaces/newsboxzero/specs/005-article-sync-readstatus/quickstart.md` will be used to confirm reconciliation, unread loading, and error handling. Ensure read articles are never loaded and are evicted immediately when detected as read.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create shared sync utility scaffolding used across stories

- [X] T001 [P] Create sync utilities barrel in `src/lib/sync/index.ts`
- [X] T002 [P] Define reconciliation types in `src/types/sync.ts` and export via `src/types/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helpers required before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Implement paged unread fetch helper in `src/lib/api/itemsSync.ts` (build server unread ID set)
- [X] T004 [P] Add cache reconciliation helper in `src/lib/storage/timelineCache.ts` to evict IDs missing from server unread set
- [X] T005 Update exports in `src/lib/storage.ts` to expose the reconciliation helper

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Unread list stays accurate (Priority: P1) 🎯 MVP

**Goal**: Remove locally cached unread articles that the server marks as read during background sync.

**Independent Test**: Mark an article as read on the server, run a sync, and verify it no longer appears in the local unread list.

### Implementation for User Story 1

- [X] T006 [US1] Wire reconciliation flow into `refresh` in `src/hooks/useFolderQueue.ts` (skip when no local unread)
- [X] T007 [US1] Apply reconciliation output before merging new unread items in `src/hooks/useFolderQueue.ts`
- [X] T008 [US1] Ensure reconciliation respects `pendingReadIds` tombstones in `src/lib/storage/timelineCache.ts`
- [ ] T009 [US1] Validate manual reconciliation steps in `specs/005-article-sync-readstatus/quickstart.md`

**Checkpoint**: User Story 1 is functional and manually verifiable

---

## Phase 4: User Story 2 - Unread items continue to load (Priority: P2)

**Goal**: Preserve the existing unread-loading behavior after reconciliation, including error handling.

**Independent Test**: Add a new unread article on the server, run a sync, and verify it appears locally even after reconciliation.

### Implementation for User Story 2

- [ ] T010 [US2] Continue unread loading when reconciliation fails in `src/hooks/useFolderQueue.ts` and surface sync error
- [ ] T011 [US2] Preserve reconciled cache updates when unread loading fails in `src/hooks/useFolderQueue.ts`
- [ ] T012 [US2] Validate manual unread-loading steps in `specs/005-article-sync-readstatus/quickstart.md`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency checks and documentation alignment

- [ ] T013 [P] Reconcile contract references in `specs/005-article-sync-readstatus/contracts/items-sync.openapi.yaml` with any API helper changes
- [ ] T014 Confirm quickstart runbook reflects final sync behavior in `specs/005-article-sync-readstatus/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Final Phase)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational phase; no dependency on US2
- **User Story 2 (P2)**: Requires Foundational phase and builds on the reconciliation flow introduced in US1

### Parallel Opportunities

- Setup tasks `T001` and `T002` can run in parallel
- Foundational tasks `T003` and `T004` can run in parallel
- Once Foundational is complete, US1 and US2 tasks can be sequenced or split across developers

---

## Parallel Example: User Story 1

```text
Task: "Wire reconciliation flow into refresh in src/hooks/useFolderQueue.ts"
Task: "Ensure reconciliation respects pendingReadIds tombstones in src/lib/storage/timelineCache.ts"
```

---

## Parallel Example: User Story 2

```text
Task: "Continue unread loading when reconciliation fails in src/hooks/useFolderQueue.ts"
Task: "Preserve reconciled cache updates when unread loading fails in src/hooks/useFolderQueue.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate User Story 1 via quickstart manual steps

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate → MVP ready
3. User Story 2 → validate → full feature
4. Polish phase checks
