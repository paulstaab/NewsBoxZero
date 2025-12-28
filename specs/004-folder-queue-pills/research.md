# Research: Folder Queue Pills

**Feature**: 004-folder-queue-pills  
**Date**: 2025-12-28  
**Purpose**: Resolve technical decisions and document best practices for the dependencies and integrations touched by the pill queue update.

---

## 1. Pill Queue Ordering & Pinning

**Decision**: Keep the active folder pinned as the first pill and sort the remaining queue by unread count descending with stable tie order. When a folder is skipped, move it to the end by assigning it the highest `sortOrder` while preserving its unread count; the next reload rebuilds the queue purely from unread counts.

**Rationale**: This matches the spec requirements (active first, stable ties, skip goes to end regardless of count) while reusing the existing `sortOrder` field and queue cache. Reload sorting remains deterministic and uses existing aggregation logic.

**Alternatives Considered**:
- Re-sort by unread count after every skip: violates the requirement to push skipped folders to the end.
- Track a separate `skippedAt` timestamp: more data model churn with no clear benefit over `sortOrder`.

---

## 2. Queue Membership & Empty States

**Decision**: Continue removing folders with zero unread count from the queue cache. If the active folder becomes empty, auto-select the next queued folder; if none remain, render the empty state with no pills or articles.

**Rationale**: This mirrors existing cache pruning logic and matches the clarified behavior in the spec. It also keeps the queue lightweight for offline use.

**Alternatives Considered**:
- Keep zero-unread folders in the queue: conflicts with FR-003 and clutters the pill list.
- Add a dedicated "All read" pill: adds UI complexity and isn't required.

---

## 3. Timeline Filtering Strategy

**Decision**: Drive the timeline list from the currently selected folder in `useFolderQueue()` (the active queue entry), leaving the `useItems()` hook unchanged. The pill strip changes selection by updating `activeFolderId` and reusing the cached articles for that folder.

**Rationale**: Keeps the data flow consistent with the current folder-first timeline architecture and avoids additional network requests.

**Alternatives Considered**:
- Refetch items per folder selection: increases latency and violates the no-new-fetches requirement.
- Keep showing mixed-folder items: contradicts FR-005.

---

## 4. SWR Usage (Best Practices)

**Decision**: Maintain `useSWRImmutable` for `folders` and `feeds` metadata and trigger revalidation only via the existing refresh action. Merge new items into the cache with `mergeItemsIntoCache()` to respect pending read tombstones.

**Rationale**: Folder metadata changes rarely, and immutable caching keeps UI stable while supporting manual refresh. The merge step ensures unread-only focus is preserved.

**Alternatives Considered**:
- Replace with `useSWRInfinite`: unnecessary complexity for this feature.
- Disable SWR caching: would slow down the timeline and increase load time.

---

## 5. Local Storage Schema (Best Practices)

**Decision**: Continue using `feedfront.timeline.v1` in `localStorage`, pruning by max age and max items per folder. The pill queue reads from and writes to the same envelope to preserve offline behavior.

**Rationale**: Reuses the existing pruning rules and avoids schema changes. It also satisfies the static delivery and unread-only constraints.

**Alternatives Considered**:
- Switch to IndexedDB: adds async complexity and migration surface area without clear benefit for the current data volume.
- Store pills separately: risks queue mismatch with cached articles.

---

## 6. UI/Accessibility (Best Practices)

**Decision**: Implement pills as a horizontal list with focus-visible styles, ARIA-selected on the active pill, and keyboard scroll affordances. Use existing Tailwind tokens and ensure the selected pill stays visible via scroll-into-view on selection.

**Rationale**: Matches the app's accessibility requirements and provides a predictable experience across 320-1440px widths.

**Alternatives Considered**:
- Vertical pill list: conflicts with the design requirement for a single-row horizontal strip.
- Rely on overflow auto without scroll handling: may hide the selected pill on narrow screens.
