# Implementation Plan: Article Sync Read Status

**Branch**: `005-article-sync-readstatus` | **Date**: 2025-12-29 | **Spec**: /workspaces/newsboxzero/specs/005-article-sync-readstatus/spec.md
**Input**: Feature specification from `/specs/005-article-sync-readstatus/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Reconcile locally cached unread articles against the server’s unread list during background sync, removing any items no longer unread before merging in newly fetched unread articles. The flow preserves the existing unread fetch endpoint, avoids loading read items, and surfaces sync errors through the existing sync feedback without new UI.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 20  
**Primary Dependencies**: Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1  
**Storage**: Browser localStorage + sessionStorage (timeline cache + session/preferences)  
**Testing**: Vitest + Testing Library, Playwright E2E, ESLint, `tsc --noEmit`  
**Target Platform**: Modern browsers as a static PWA served from CDN  
**Project Type**: Web (single Next.js app)  
**Performance Goals**: Sync completes within 5 seconds for up to ~500 unread articles; UI remains responsive during background sync  
**Constraints**: Static export only, unread-only data handling, no new UI, use existing sync feedback, avoid redundant fetches when no local unread  
**Scale/Scope**: Single-operator app; feature limited to sync flow, timeline cache, and items API wrappers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Simplicity First** — Background-only sync enhancement inside the existing flow; no new docs beyond required specs; no extra services or flags.
2. **Code Quality Discipline** — Keep changes scoped to sync/reconciliation helpers and cache updates; continue ESLint + `tsc --noEmit` + Vitest/Playwright coverage for risky logic.
3. **Static Delivery Mandate** — No runtime services added; sync remains client-side hydration against headless-rss endpoints; static export unchanged.
4. **Right-Sized Tests** — Add unit coverage for reconciliation logic (remove read items, no-op when none), and E2E for sync error behavior; manual smoke only for offline/network failure reproduction.
5. **Experience Consistency** — No UI changes; reuse existing error/empty states; keep current breakpoints and visual regression coverage intact.
6. **Unread-Only Focus** — Reconciliation uses unread-only endpoints and evicts items from cache immediately when determined read; no read items are fetched, stored, or rendered.

## Project Structure

### Documentation (this feature)

```text
specs/005-article-sync-readstatus/
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
├── app/
├── components/
├── hooks/
├── lib/
├── styles/
└── types/

tests/
├── e2e/
├── mocks/
├── unit/
└── visual/
```

**Structure Decision**: Single Next.js app; sync changes live in hooks (`useFolderQueue`/`useItems`), storage helpers, and API wrappers under `src/`.

## Constitution Check (Post-Design)

1. **Simplicity First** — Design keeps reconciliation in existing sync flow; no new services or artifacts.
2. **Code Quality Discipline** — Design isolates reconciliation to cache merge helpers and keeps API usage unchanged.
3. **Static Delivery Mandate** — Only client-side calls to existing headless-rss endpoints.
4. **Right-Sized Tests** — Planned unit + E2E checks cover reconcile/remove and error handling.
5. **Experience Consistency** — No visual changes beyond existing sync feedback.
6. **Unread-Only Focus** — Contracts use unread-only queries; cache eviction is immediate on read detection.
