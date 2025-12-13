<!--
Sync Impact Report
- Version: 1.3.0 → 2.0.0
- Modified Principles: Remaining principles renumbered after removing VI. Performance Guardrails
- Added Sections: None
- Removed Sections: Core Principle VI. Performance Guardrails
- Templates Updated: ✅ .specify/templates/plan-template.md (gates realigned), ✅ .specify/templates/tasks-template.md (references removed)
- Follow-ups: None
-->

# Feedfront Constitution

## Scope
Feedfront is a single-user progressive web app (PWA) that serves as a front-end client for headless-rss backends.

## Core Principles

### I. Simplicity First
Feedfront serves exactly one operator, so work MUST minimize ceremony and moving parts.
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

### V. Experience Consistency
UI work MUST use the shared design tokens, typography scale, and spacing system, remain responsive between 320px and 1440px, and meet WCAG 2.1 AA contrast and keyboard navigation rules.


## Delivery Constraints

- Simplicity-aligned scope: Features must deliver direct value to the lone operator without spawning extra release documentation, playbooks, or artifact-signoff steps.
- Static-first: Build artifacts must be immutable assets deployable to a CDN. All server-side needs must route through existing headless-rss endpoints, and any proposal for custom compute requires an approved RFC plus rollback plan.
- Dependency discipline: Frontend libraries must be audited for bundle impact and security; adding a framework requires an RFC that explains bundle impact and rollback.
- Evidence expectations: Plans and tasks must spell out the minimal automated tests or manual checks needed for each story. Recorded evidence is optional; concise PR notes are sufficient when automation is not.

## Workflow & Quality Gates

1. **Plan**: Before Phase 0 research, document how the work satisfies every gate (Simplicity, Code Quality, Static Delivery, Right-Sized Tests, Experience) and call out any proposed exceptions with an RFC link.
2. **Spec**: User stories must include UX acceptance criteria and describe the verification approach (automated or manual) expected for each flow.
3. **Tasks**: Each user story receives implementation tasks plus right-sized verification tasks so reviewers can see exactly what proof will accompany the change.

**Version**: 2.0.0 | **Ratified**: 2025-12-12 | **Last Amended**: 2025-12-13
