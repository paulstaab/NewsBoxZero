# Research: Article Sync Read Status

## Decisions

### 1) Reconciliation uses unread-only `/items` fetch and diff
- **Decision**: Build a set of server unread IDs by fetching `/items` with `getRead=false` and comparing against locally cached unread IDs to evict items no longer unread.
- **Rationale**: Satisfies unread-only mandate (no read items fetched), uses existing endpoint, and allows reconciliation without new APIs.
- **Alternatives considered**: Use `/items/updated` (could return read items, violates unread-only focus), fetch per-item status (not supported by API).

### 2) Sequence: reconcile before merging new unread items
- **Decision**: During refresh, collect unread items into a staging list, reconcile local cache against the full server unread ID set, then merge newly fetched unread items into the cache.
- **Rationale**: Enforces “reconcile first, load next” semantics without duplicating network calls; avoids showing stale unread entries.
- **Alternatives considered**: Merge as pages load (could briefly show stale items), run a second fetch pass (extra bandwidth).

### 3) Skip reconciliation when no local unread exists
- **Decision**: If the local cache has zero unread articles, skip reconciliation and proceed directly to the existing unread fetch/merge flow.
- **Rationale**: Avoids unnecessary work and bandwidth when there is nothing to reconcile.
- **Alternatives considered**: Always reconcile (wasted calls when cache is empty).

### 4) Error handling uses existing sync feedback
- **Decision**: On reconciliation failure, keep local unread state unchanged, continue unread loading, and surface the error via existing sync toast/empty-state logic.
- **Rationale**: Matches clarified requirements and preserves UI consistency without introducing new UI.
- **Alternatives considered**: Abort sync on reconciliation errors (regresses unread loading), introduce new UI (violates constraints).

### 5) Performance strategy for large lists
- **Decision**: Use incremental pagination (existing `batchSize` + `offset`) to build the server unread ID set, then apply a single cache eviction pass at the end of the refresh.
- **Rationale**: Keeps UI responsive and bounds memory while still reconciling within the 5s target for ~500 unread items.
- **Alternatives considered**: Fetch `batchSize=-1` in one call (risk of slow response), reconcile per page (higher churn on cache updates).
