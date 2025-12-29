# Research: Pinned Action Buttons

## Decisions

### Decision: Drive disabled state from existing unread/timeline cache state
- Rationale: Timeline cache already tracks unread-only articles and derived folder progress; no new data loads or API calls are needed.
- Alternatives considered: Add a new unread-count endpoint or re-fetch on every scroll; rejected because it adds runtime cost and violates static-first simplicity.

### Decision: Pin the action cluster with fixed positioning and allow overlap
- Rationale: Matches the clarified requirement to allow overlap on narrow viewports and keeps the controls always reachable.
- Alternatives considered: Add padding/margins or responsive repositioning; rejected because it complicates layout and contradicts the overlap allowance.

### Decision: Use icon-only buttons with aria-label + tooltip
- Rationale: Keeps the UI textless while preserving accessibility and discoverability.
- Alternatives considered: Visible text labels or screen-reader-only labels without tooltip; rejected because the spec requires icon-only plus tooltip.

### Decision: Reuse existing APIs for Sync and Mark All Read
- Rationale: Sync already uses `/items` unread-only fetch; Mark All Read uses `/folders/{id}/read`. No API change required.
- Alternatives considered: Create new aggregated endpoints; rejected because it introduces new backend dependencies.

### Decision: Move Sync to the right side of the timeline header and remove the status summary
- Rationale: Directly implements the clarified requirement and keeps the header layout simpler.
- Alternatives considered: Keeping the summary elsewhere; rejected per clarification.
