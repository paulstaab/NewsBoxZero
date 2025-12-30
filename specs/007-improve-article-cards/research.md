# Phase 0 Research: Improve Timeline Article Cards

## Findings

### Decision: Keep expansion state local to each card
- Rationale: Supports multiple expanded cards without introducing global state or storage writes, keeping scope limited to the timeline UI.
- Alternatives considered: Global expanded-set store keyed by article ID (rejected due to unnecessary state plumbing for a purely presentational toggle).

### Decision: Use a non-link container with explicit keyboard handling and stopPropagation on links
- Rationale: Allows clicking anywhere on the card to toggle expansion while preserving link behavior and keyboard accessibility.
- Alternatives considered: Wrapping the card in a button element (invalid nesting with links) or relying solely on pointer interactions (accessibility regression).

### Decision: Fetch full article content on expansion via existing item endpoint
- Rationale: Uses the existing API contract and avoids preloading full bodies for every item, keeping timeline fast and aligned with static delivery.
- Alternatives considered: Fetching full content in the initial timeline payload (higher bandwidth, slower initial render).

### Decision: Responsive thumbnail placement with stacked fallback
- Rationale: Maintains right-side thumbnail on wide screens while stacking below text on narrow widths, matching UX requirements.
- Alternatives considered: Fixed-side thumbnails at all widths (causes overlap at 320px).

### Decision: Mark as read on expand and keep visible until next sync reconciliation
- Rationale: Matches functional requirements while aligning with unread-only focus by relying on the existing sync reconciliation to evict read items afterward.
- Alternatives considered: Marking read on collapse (delays read state) or hiding immediately (conflicts with expanded reading behavior).
