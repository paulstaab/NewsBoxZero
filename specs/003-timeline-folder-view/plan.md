# Implementation Plan: Folder-Based Timeline View

**Branch**: `003-timeline-folder-view` | **Date**: 2025-12-16 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-timeline-folder-view/spec.md`

## Summary

Deliver a folder-first reading flow inside the existing Next.js timeline page. The page loads a single folder at a time, sorted by unread volume, and renders the folder's newest articles at the top. Unread articles are cached in browser storage so they persist between visits, while mark-as-read, skip, and inline expansion actions update both the UI state and the headless-rss items API. Every page load (and manual Update action) merges fresh articles from `/items` with the locally stored unread queue without losing unfinished articles. Empty states communicate when all folders have been processed and provide a restart affordance.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 24 (Next.js App Router)  
**Primary Dependencies**: Next.js 14 (static export), React 18, SWR for client fetching, date-fns for timestamps, MSW/Playwright for tests  
**Storage**: Browser localStorage + sessionStorage for auth plus a new timeline cache namespace (NEEDS CLARIFICATION: key schema & retention policy)  
**Testing**: Vitest for hooks/utils, Playwright (including axe-core + visual) for end-to-end folder navigation, MSW-backed mocks  
**Target Platform**: Modern Chromium/Firefox/Safari browsers served from static CDN (`next export` output)  
**Project Type**: Single Next.js progressive web app (no backend services)  
**Performance Goals**: 500 ms initial unread render from cache, ≤10 s update cycle even with 100 articles/folder (NEEDS CLARIFICATION: instrumentation approach)  
**Constraints**: Must work offline with cached unread queue, respect WCAG 2.1 AA, and avoid new runtime compute (NEEDS CLARIFICATION: merge strategy when API fetch fails mid-session)  
**Scale/Scope**: Single operator with up to ~50 folders and ~2,000 unread items per session; feature touches only the timeline route, timeline components, hooks, and storage helpers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Simplicity First** — Reuse the existing timeline route, article components, and API wrappers instead of introducing new services. All persistence stays in browser storage; no new scripts, migrations, or release artifacts are needed. The plan adds only the docs that `/speckit.plan` requires.
2. **Code Quality Discipline** — Continue to run ESLint, `tsc --noEmit`, and Vitest in CI. Each user story will map to focused PRs (e.g., folder sorting, unread persistence, mark-read workflow) with co-located utility docs. Dead code (e.g., unused infinite scroll helpers) will be removed alongside replacements.
3. **Static Delivery Mandate** — The feature remains within Next.js App Router with `output: 'export'`. All data is fetched client-side via SWR against headless-rss. No API routes or runtime compute are introduced; updates happen via existing `/items` endpoints.
4. **Right-Sized Tests** — Vitest will cover new folder-sorting utilities, unread cache reducers, and mark-read state transitions. Playwright will exercise the folder progression (mark-read vs. skip), Update button behavior, inline expansion marking read, and empty-state restart message. Manual smoke is limited to offline verification when the network is disabled in DevTools.
5. **Experience Consistency** — Timeline UI continues to use shared tokens from `src/styles/tokens.css`, responsive layout (320–1440 px), and keyboard/axe accessibility checks. Playwright screenshot diffs will capture folder header, article cards with thumbnails, skip/mark buttons, and the "all folders viewed" state.

## Project Structure

### Documentation (this feature)

```text
specs/003-timeline-folder-view/
├── plan.md          # This document (updated by /speckit.plan)
├── spec.md          # Approved feature specification
├── research.md      # Phase 0 decisions (created below)
├── data-model.md    # Phase 1 entity design
├── quickstart.md    # Phase 1 developer guide
├── contracts/       # Phase 1 API references
└── checklists/      # Existing requirements checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── timeline/
│       └── page.tsx        # Main entry; will host folder-first controller
├── components/
│   ├── timeline/
│   │   ├── TimelineList.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── UnreadSummary.tsx
│   │   └── FolderStepper.tsx  # new: folder header, mark-read/skip buttons
│   └── ui/
├── hooks/
│   ├── useAuth.tsx
│   ├── useItems.ts          # new folder batching + update logic lives here
│   └── useFolders.ts        # new helper for unread counts + persistence
├── lib/
│   ├── api/
│   │   ├── items.ts         # already exposes mark/star endpoints
│   │   └── folders.ts       # will supply folder metadata/unread counts
│   ├── storage.ts           # extend with timeline cache helpers
│   ├── utils/
│   │   └── unreadAggregator.ts # extend for folder grouping/sorting
│   └── swr/
├── types/
│   ├── article.ts
│   ├── folder.ts            # extends with unread summary fields
│   └── index.ts
└── tests/
    ├── unit/
    │   ├── lib/           # add unread cache + aggregators specs
    │   └── hooks/
    └── e2e/
        ├── us1-login-timeline.spec.ts
        └── timeline-folders.spec.ts   # new Playwright scenario
```

**Structure Decision**: Continue with a single Next.js project plus shared component/hook libraries; the feature introduces only incremental files inside the timeline module and supporting libs.

## Complexity Tracking

No constitution violations identified. All work stays within the existing Next.js static app and browser storage mechanisms.

## Post-Design Constitution Re-Check

1. **Simplicity First** ✅ — Phase 0/1 artifacts (research/data-model) confirm everything runs inside the existing timeline route with only localStorage persistence. No auxiliary services, scripts, or deployment steps were introduced.
2. **Code Quality Discipline** ✅ — `data-model.md` defines reducers/helpers to be covered by Vitest. `research.md` documents cache schema and retry logic, keeping scope tightly focused on folder progression. Tasks will map one-to-one to user stories.
3. **Static Delivery Mandate** ✅ — `research.md` reiterates reliance on `GET /items`/`POST /items/*` only, and `quickstart.md` codifies `npm run build && next export` as the deployment path. No runtime compute is proposed.
4. **Right-Sized Tests** ✅ — Test expectations listed in plan + quickstart: Vitest for cache + sorting, Playwright for mark-read/skip/update, manual offline smoke only. This matches the feature’s risk surface.
5. **Experience Consistency** ✅ — Data model + spec describe folder headers, buttons, and article cards that all reuse shared tokens. Playwright screenshots will cover default, skip, mark-read, and empty states per quickstart.
