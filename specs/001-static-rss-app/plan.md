# Implementation Plan: Static Headless RSS Web App

**Branch**: `001-static-rss-app` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-static-rss-app/spec.md`

## Summary

Build a static Next.js (SSG/export) web application that serves as a frontend for headless-rss. On first load the app displays a login wizard; after authentication it fetches feeds, folders, and items via the Nextcloud v1.3 REST API and renders an aggregated, chronological timeline with read/star/subscription management capabilities—all without runtime server dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20 LTS  
**Primary Dependencies**: Next.js 14 (static export), React 18, TailwindCSS (or CSS Modules), SWR (client fetch caching)  
**Storage**: Browser session/local storage only (no backend DB)  
**Testing**: Vitest (unit), Playwright (integration + visual regression), axe-core (accessibility)  
**Target Platform**: Modern browsers (Chrome/Firefox/Safari latest 2 versions), static CDN deployment  
**Project Type**: Web application (single Next.js project with static export)  
**Constraints**: JS bundle ≤180KB gzip, CSS ≤60KB gzip, total export ≤30MB, offline-capable shell  
**Scale/Scope**: Single user per instance, target ≤1,000 feeds/folders, ≤10,000 cached items in memory  
**Unread Count Strategy**: Because the Nextcloud News v1.3 feeds API does not include per-feed unread counts, the client computes them by tallying `unread=true` articles returned by `/items` for each feed, then aggregating folder totals from their child feeds. Overall unread totals are the sum of all feed counts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Code Quality Discipline** — Use ESLint (strict TypeScript rules), Prettier, and `tsc --noEmit` in CI. Keep each PR to one user story; inline JSDoc for non-trivial helpers. Dead code removal enforced via `eslint-plugin-unused-imports`.
2. **Static Delivery Mandate** — `next build && next export` produces `/out` with no `getServerSideProps`; all data fetched client-side via SWR after user provides credentials. No custom API routes; headless-rss endpoints are the only external compute.
3. **Test Evidence First** — Write failing Vitest unit tests for API client, auth helpers, and state reducers before implementation. Write Playwright E2E for login wizard, timeline load, mark-read, and subscription CRUD. Coverage gate: ≥90% of new lines via `vitest --coverage`.
4. **Experience Consistency** — Define tokens in `src/styles/tokens.css` (colors, spacing 4/8/16/24/32px, type scale). Use axe-core in Playwright to assert 0 critical violations. Percy (or Playwright screenshots) capture 320/768/1024/1440px breakpoints for onboarding, timeline, empty state, and modals.
5. **Performance Guardrails** — Measure baseline bundle with `next build` output; target delta ≤180KB JS gzip. Lazy-load article body on intersection; prefetch next batch at 75% scroll.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/                   # Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx           # redirects to /timeline or /login
│   ├── login/
│   │   └── page.tsx       # Login wizard (FR-001)
│   └── timeline/
│       └── page.tsx       # Aggregated timeline (US1)
├── components/
│   ├── ui/                # Primitives (Button, Input, Toggle, Modal)
│   ├── timeline/          # ArticleCard, ArticleList, InfiniteScroll
│   ├── sidebar/           # FolderTree, FeedList, UnreadBadge
│   └── subscription/      # AddFeedModal, RenameFolderModal
├── lib/
│   ├── api/               # headless-rss client wrappers (feeds, items, folders, auth)
│   ├── hooks/             # useFeeds, useItems, useAuth, usePreferences
│   └── utils/             # base64, storage helpers, error formatting
├── styles/
│   └── tokens.css         # Design tokens (colors, spacing, typography)
└── types/
    └── api.ts             # TypeScript interfaces mirroring OpenAPI schemas

tests/
├── unit/                  # Vitest tests for lib/*
├── integration/           # Playwright E2E (login, timeline, CRUD)
└── visual/                # Playwright screenshot / Percy snapshots

public/
└── ...                    # Static assets (favicon, manifest)

next.config.js             # output: 'export'
```

**Structure Decision**: Single Next.js project using the App Router with static export (`output: 'export'`). No backend directory; all API interactions are client-side calls to headless-rss.

## Complexity Tracking

> No constitution violations identified. The project uses a single Next.js static export, client-side data fetching, and no custom runtime compute.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

---

## Post-Design Constitution Re-Check

*Verified after Phase 1 design completion (2025-12-10)*

1. **Code Quality Discipline** ✅ — `data-model.md` defines TypeScript interfaces with validation rules; `contracts/` documents all API shapes. ESLint + Prettier enforced per plan. No dead code anticipated; single-concern PRs planned per user story.

2. **Static Delivery Mandate** ✅ — `research.md` confirms Next.js 14 `output: 'export'` produces immutable `/out` directory. All data fetching client-side via SWR. No `getServerSideProps`, no API routes, no middleware. `quickstart.md` documents build command.

3. **Test Evidence First** ✅ — `research.md` §7 specifies Vitest + Playwright toolchain. `quickstart.md` includes test command patterns and MSW mock setup. Coverage threshold set at 90%. E2E tests outlined for login wizard, timeline, mark-read flows.

4. **Experience Consistency** ✅ — `research.md` §6 specifies TailwindCSS with custom breakpoints (xs/sm/md/lg). Responsive behavior documented in spec.md. axe-core integration confirmed via Playwright. Design tokens path established (`src/styles/tokens.css`).

5. **Performance Guardrails** ✅ — `research.md` §8 specifies bundle analysis in CI. Target budgets documented (JS ≤180KB, CSS ≤60KB, TTI <1.5s). Lazy-loading and prefetch strategies defined.

**Gate Status**: PASS — All constitution principles satisfied in design artifacts.

---

## Generated Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| Research | `research.md` | Technical decisions, dependency analysis, testing strategy |
| Data Model | `data-model.md` | TypeScript interfaces, validation rules, state transitions |
| Contracts | `contracts/README.md` | API endpoint index |
| Contracts | `contracts/feeds.md` | Feeds API contract |
| Contracts | `contracts/items.md` | Items API contract |
| Contracts | `contracts/folders.md` | Folders API contract |
| Contracts | `contracts/auth.md` | Authentication contract |
| Quickstart | `quickstart.md` | Developer setup guide |

---

## Next Steps

Run `/speckit.tasks` to generate `tasks.md` with implementation tasks for each user story.
