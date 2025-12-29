# Research: Folder-Based Timeline View

**Feature**: 003-timeline-folder-view  
**Date**: 2025-12-16  
**Purpose**: Resolve Technical Context unknowns and document best practices for the dependencies and integrations this feature adds.

---

## 1. Timeline Cache Schema & Retention

**Question**: How should unread articles be persisted locally so folders reload instantly while respecting storage limits?

**Decision**: Store a `TimelineCache` JSON blob under `newsboxzero.timeline.v1` in `localStorage`, keyed by folder ID with compact article stubs (id, feedId, folderId, title, summary, thumbnail, pubDate, unread, starred, hasFullTextFlag). Retain only the latest 200 items per folder or items not older than 14 days, whichever is smaller.

**Rationale**: Namespacing avoids collisions with existing session/preferences keys and allows future migrations by bumping the suffix. Limiting stored fields keeps the payload under ~200 KB even for heavy folders. Age + count pruning guarantees initial render stays <500 ms and avoids stale data.

**Alternatives Considered**:
- IndexedDB: durable but adds async complexity and requires migration logic; unnecessary for a <2 MB dataset.
- sessionStorage: would lose state on tab close and violates persistence requirement.

---

## 2. Performance Instrumentation Approach

**Question**: How do we prove the 500 ms initial render and 10 s update targets without adding backend telemetry?

**Decision**: Use the browser Performance API (`performance.mark`/`performance.measure`) around two spans: `timeline-cache-ready` (from module init to First Contentful Paint of folder header) and `timeline-update-complete` (from Update button click to SWR mutate settle). Report both metrics through the existing `metricsClient` (if enabled) and log to console in development. Playwright performance assertions read these marks to fail tests if thresholds are exceeded.

**Rationale**: Requires no new infrastructure and works offline. Developers can see measurements immediately, and automated tests can enforce limits using `page.evaluate(() => performance.getEntriesByName(...))`.

**Alternatives Considered**:
- Web Vitals library: heavier dependency and overkill for two custom spans.
- Relying on manual stopwatch testing: not repeatable or automatable.

---

## 3. Offline Merge Strategy When Updates Fail

**Question**: What happens when `/items` fails during the automatic update—how do we keep unread articles intact without double-counting new arrivals?

**Decision**: Maintain a `pendingReadIds` and `pendingSkipFolderIds` set inside the cache. When an update fails, keep local unread arrays untouched, surface a toast, and schedule a retry with exponential backoff (1 s → 2 s → 4 s). On the next successful fetch, merge by:
1. Filtering out any IDs present in `pendingReadIds` so previously marked articles stay removed.
2. Appending only new article IDs (dedupe by global article ID) to the folder queue.
3. Clearing retry metadata after success.

**Rationale**: This approach guarantees read operations remain idempotent locally, even if the server call fails, and prevents duplicates. It also allows skip actions to persist while offline.

**Alternatives Considered**:
- Re-fetch entire unread state from API after each failure: wastes bandwidth and could reintroduce read items when offline.
- Forcing users to retry manually: contradicts requirement for automatic updates on load.

---

## 4. Folder Ordering & Unread Count Source

**Question**: Where do we source unread counts so folders can be sorted without a new backend endpoint?

**Decision**: Derive counts client-side by combining `/folders` metadata (folder id/name → feed ids) with the cached unread articles. On update, recalculate folder totals by summing unread articles per folder inside the cache, then push the order into a deterministic queue (tie-breaker: alphabetical folder name, then folder id). Persist the queue in `TimelineCache` so refreshes reuse the same order until counts change.

**Rationale**: Avoids extra network traffic and keeps logic entirely client-side. Reusing cached articles ensures offline sorting still works.

**Alternatives Considered**:
- Calling `/feeds` for unread counts: endpoint does not expose per-feed unread numbers in the current API version.
- Adding a custom aggregation endpoint: violates Static Delivery Mandate.

---

## 5. SWR Best Practices for Folder Progression

**Question**: How should we structure SWR hooks to support folder-by-folder progression without refetching already loaded items?

**Decision**: Keep the existing `useItems` hook for batches but wrap it with a new `useFolderQueue` hook that:
- Preloads the next folder's items via `mutate` with `revalidate: false` once the current folder is within 5 items of completion.
- Exposes `markFolderRead()` that calls `markItemsRead` (batch endpoint) and locally removes IDs.
- Uses `useSWRImmutable` for folder metadata so it loads once per session.

**Rationale**: Layering on top of `useItems` minimizes churn while giving us folder-aware semantics. `useSWRImmutable` fits because folder definitions change rarely; we only revalidate after manual Update.

**Alternatives Considered**:
- Switching to `useSWRInfinite`: complicates manual cache control and would still require custom folder logic.
- Writing bespoke fetch/state logic without SWR: would duplicate caching and retry logic we already rely on.

---

## 6. Headless-RSS Integration Constraints

**Question**: Which existing endpoints cover mark-read, skip, and update requirements?

**Decision**: Rely exclusively on the existing Items endpoints:
- `GET /items` (with `type=3`, `getRead=false`) for unread batches
- `POST /items/read/multiple` for folder-level mark-all
- `POST /items/{id}/read` when expanding single articles
- `POST /items/unread/multiple` for future skip rollback (if needed)

Skip is purely client-side (no API call) until the user eventually marks the folder read. The Update button simply re-triggers SWR revalidation and merges results with cache. No new transport contracts are required.

**Rationale**: Keeps us compliant with Static Delivery Mandate and avoids backend changes.

**Alternatives Considered**:
- Introducing a `/folders/unread` endpoint: would shift complexity to the server and require an RFC.
- Using `/items/updated`: only returns items changed since timestamp but complicates initial load; we still need `/items` for first render.

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Local persistence | `newsboxzero.timeline.v1` localStorage blob with per-folder arrays capped at 200 items / 14 days |
| Performance metrics | Performance API marks + console/metricsClient reporting |
| Offline merge | Pending-read tombstones + exponential retry without discarding cache |
| Folder ordering | Client-side aggregation of cached unread items + `/folders` metadata |
| SWR layering | New `useFolderQueue` atop `useItems`, `useSWRImmutable` for metadata |
| API usage | Reuse existing `/items` endpoints; skip remains client-only |
