<!--
Sync Impact Report
- Version: 1.0.0 → 1.1.0
- Modified Principles: II. Static Delivery Mandate (new), III. Test Evidence First (renumbered), IV. Experience Consistency (renumbered), V. Performance Guardrails (renumbered)
- Added Sections: None
- Removed Sections: None
- Templates Updated: ✅ .specify/templates/plan-template.md, ✅ .specify/templates/spec-template.md, ✅ .specify/templates/tasks-template.md
- Follow-ups: None
-->

# Feedfront Constitution

## Core Principles

### I. Code Quality Discipline
All contributions MUST pass automated linting, type-checking, and accessibility tooling before review, keep functions focused, and delete dead code in the same change that makes it obsolete. Pull requests are limited to a single concern, must ship with inline documentation when intent is non-obvious, and may not lower static-analysis quality gates. **Rationale**: Feedfront is a static frontend; regressions linger in caches, so we only merge work that is easy to audit and rollback-free.

### II. Static Delivery Mandate
Every feature MUST compile down to immutable assets served via CDN, with all dynamic data fetched from headless-rss APIs at build time or through client-side hydration that works without server state. Runtime servers, custom APIs, or persistent sessions are prohibited unless justified via an RFC approved by maintainers. Builds must remain reproducible, deterministic, and capable of running under `npm run build && npm run export` on clean environments. **Rationale**: Feedfront exists to present RSS data statically; introducing server dependencies undermines deployment simplicity and resilience.

### III. Test Evidence First
Every change MUST include failing tests before implementation work begins and end-to-end verification before merge. Minimum coverage is 90% of newly added lines, integration tests are mandatory whenever API contracts or routing change, and visual regression snapshots are required for any UI delta. **Rationale**: Headless RSS data is volatile; only executable evidence proves we preserved expected behavior.

### IV. Experience Consistency
UI work MUST use the shared design tokens, typography scale, and spacing system, remain responsive between 320px and 1440px, and meet WCAG 2.1 AA contrast and keyboard navigation rules. Copy updates must run through the approved microcopy checklist to keep tone aligned with the headless RSS brand. **Rationale**: Feedfront is often embedded alongside other tools; we must look and behave the same everywhere.

### V. Performance Guardrails
Core pages MUST load in under 1.0s p75 on broadband and 2.5s p90 on throttled 3G, maintain Time to Interactive under 1.5s, and keep client-side JavaScript bundles below 200KB gzip. Lazy-load non-critical assets, prefetch RSS data only when visible, and record performance metrics into the monitoring dashboard with every deployment. **Rationale**: Readers expect news feeds to feel instant; any drag erodes trust in headless RSS.

## Delivery Constraints

- Static-first: Build artifacts must be immutable assets deployable to a CDN. All server-side needs must route through existing headless-rss endpoints, and any proposal for custom compute requires an approved RFC plus rollback plan.
- Dependency discipline: Frontend libraries must be audited for bundle impact and security; adding a framework requires an RFC reviewed against Principle V budgets.
- Accessibility budget: Every interaction requires keyboard parity and focus states, with axe-core (or equivalent) reports attached to PRs.
- Observability: Ship Lighthouse reports and performance traces as part of each release package so stakeholders can confirm Principle V compliance.

## Workflow & Quality Gates

1. **Plan**: Before Phase 0 research, document Constitution Gates (quality, test, experience, performance) in the plan and enumerate how the feature will satisfy each.
2. **Spec**: User stories must include UX acceptance criteria, accessibility checks, and measurable performance budgets; specs without these are rejected.
3. **Tasks**: Each user story receives explicit tasks for tests, UX verification, and performance measurement; no story is marked complete until all three categories pass.
4. **Review**: Code review checklists must log evidence for lint/test runs, accessibility scans, and performance benchmarks; approvals without evidence are invalid.
5. **Release**: Deployments require attaching the latest Lighthouse scores, bundle size diffs, and screenshot diffs to the release record.

## Governance

- Scope: This constitution supersedes conflicting conventions in docs, templates, or legacy scripts.
- Amendments: Anyone may propose an amendment via PR referencing this file, but the proposal MUST include migration steps, updated templates, and a version bump rationale. Approval requires at least two maintainers, one focused on UX and one on performance.
- Versioning: Semantic versioning governs the constitution. MAJOR for rule removals or incompatible rewrites, MINOR for new principles or expanded requirements, PATCH for clarifications. The Sync Impact Report at the top of this document records cross-file updates.
- Compliance: Every PR description must reference the principles touched, and checklists/scripts that enforce these rules must be kept in lockstep with this file.
- Review cadence: A quarterly review assesses whether principles still protect Feedfront’s goals; findings are logged in `/docs/governance.md` (create if absent) and linked from future amendments.

**Version**: 1.1.0 | **Ratified**: 2025-12-10 | **Last Amended**: 2025-12-10
