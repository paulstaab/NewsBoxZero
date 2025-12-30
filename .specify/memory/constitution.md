<!--
Sync Impact Report
- Version: 2.1.0 → 2.1.1
- Modified Principles: VI. Unread-Only Focus
- Added Sections: None
- Removed Sections: None
- Templates Updated: ✅ .specify/templates/plan-template.md, ✅ .specify/templates/tasks-template.md, ✅ .specify/templates/spec-template.md (no changes needed)
- Follow-ups: None
-->

# NewsBoxZero Constitution

## Scope
NewsBoxZero is a single-user progressive web app (PWA) that serves as a front-end client for headless-rss backends.

## Core Principles

### I. Simplicity First
NewsBoxZero serves exactly one operator, so work MUST minimize ceremony and moving parts.
- Deliver only artifacts that future maintenance truly needs; do not produce release playbooks, sign-off packets, or recorded test evidence unless a dependency explicitly demands it.
- Prefer solutions with fewer services, dependencies, and feature flags. New compute or tooling requires a clear solo-maintainer story and rollback.
- Document lightweight checklists directly inside plans or PRs instead of creating new templates.

### II. Code Quality Discipline
All contributions MUST pass automated linting and type-checking before review, keep functions scoped to a single concern, and delete dead code in the same change that makes it obsolete. Maintain descriptive naming and in-file notes whenever logic is non-obvious so the single maintainer can trace intent quickly.

### III. Static Delivery Mandate
Every feature MUST compile down to immutable assets served via CDN, with all dynamic data fetched from headless-rss APIs at build time or through client-side hydration that works without server state. Runtime servers, custom APIs, or persistent sessions are prohibited unless justified via an RFC approved by maintainers. Builds must remain reproducible, deterministic, and capable of running under `npm run build && npm run export` on clean environments.

### IV. Right-Sized Tests
Verification MUST exist, but it must match risk—not bureaucracy.
- Add or update automated tests before merge whenever behavior could regress silently (data fetching, mutations, auth, routing, caching, or accessibility logic).
- Manual smoke tests are acceptable for copy or purely presentational tweaks; describe the manual check in the PR instead of capturing video evidence.
- No change may merge if regressions would only be caught by users later; if automation is impractical, explain why and provide the lightweight checklist that was executed.
- Unit tests should cover positive and negative cases. E2E should focus on the most important user journeys along the happy path.

### V. Experience Consistency
UI work MUST use the shared design tokens, typography scale, and spacing system, remain responsive between 320px and 1440px, and meet WCAG 2.1 AA contrast and keyboard navigation rules.

### VI. Unread-Only Focus
The application MUST exclusively work with unread articles, with a narrow exception
for items just marked as unread locally until the next sync reconciliation.
- The application MUST NOT load, fetch, or display articles marked as read, except
  when a user just marked an item as unread locally and the next sync has not run yet.
- Articles marked as read MUST be removed from local storage, cache, and in-memory
  state once the read state is confirmed or after the next sync reconciliation.
- Articles just marked as unread MAY remain visible and stored until the next sync
  so users can finish reading without interruption; after sync they MUST follow the
  unread-only rules.
- API queries MUST explicitly filter for unread status when possible; prefetching or
  background sync operations MUST NOT retrieve read articles.
- UI components MUST NOT render read article data, even during transitions or animations.

**Rationale**: NewsBoxZero exists to surface unread content efficiently. Retaining read articles wastes storage, complicates state management, and risks surfacing stale content. Immediate eviction on read ensures the solo operator's limited storage and cognitive bandwidth stay focused on actionable items.


## Delivery Constraints

- Simplicity-aligned scope: Features must deliver direct value to the lone operator without spawning extra release documentation, playbooks, or artifact-signoff steps.
- Static-first: Build artifacts must be immutable assets deployable to a CDN. All server-side needs must route through existing headless-rss endpoints, and any proposal for custom compute requires an approved RFC plus rollback plan.
- Dependency discipline: Frontend libraries must be audited for bundle impact and security; adding a framework requires an RFC that explains bundle impact and rollback.
- Evidence expectations: Plans and tasks must spell out the minimal automated tests or manual checks needed for each story. Recorded evidence is optional; concise PR notes are sufficient when automation is not.

## Workflow & Quality Gates

1. **Plan**: Before Phase 0 research, document how the work satisfies every gate (Simplicity, Code Quality, Static Delivery, Right-Sized Tests, Experience, Unread-Only Focus) and call out any proposed exceptions with an RFC link.
2. **Spec**: User stories must include UX acceptance criteria and describe the verification approach (automated or manual) expected for each flow.
3. **Tasks**: Each user story receives implementation tasks plus right-sized verification tasks so reviewers can see exactly what proof will accompany the change.

**Version**: 2.1.1 | **Ratified**: 2025-12-12 | **Last Amended**: 2025-12-30
