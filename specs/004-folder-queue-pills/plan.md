# Implementation Plan: Folder Queue Pills

**Branch**: `004-folder-queue-pills` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/004-folder-queue-pills/spec.md`

## Summary

Replace the Unread/All pills on the timeline page with a horizontal folder queue pill strip showing folder names and unread counts. The queue is sorted by unread count (stable ties), excludes zero-unread folders, keeps the active folder pinned first and highlighted, and updates on mark-all-read or skip actions. The timeline list remains scoped to the selected folder, and empty states appear when no unread folders remain. Implementation reuses the existing folder queue cache, hooks, and headless-rss endpoints without new APIs.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 20 (Next.js App Router)  
**Primary Dependencies**: Next.js 16 (static export), React 19, SWR, Tailwind CSS, date-fns  
**Storage**: Browser `localStorage` for `feedfront.timeline.v1` cache; session storage for auth tokens  
**Testing**: Vitest + Testing Library for hooks/utils; Playwright (with axe-core) for UI and a11y  
**Target Platform**: Modern browsers (Chrome/Firefox/Safari) served from static CDN output  
**Project Type**: Single Next.js web app (PWA-style, no backend services)  
**Performance Goals**: Keep timeline load time within 10% of current baseline; maintain 60fps horizontal scrolling of pills  
**Constraints**: Static export (`next build && next export`), WCAG 2.1 AA, unread-only focus, responsive 320-1440px, no extra data fetches beyond current timeline load  
**Scale/Scope**: Single operator; ~50 folders and ~2,000 unread items per session; changes limited to timeline UI, hooks, and cache helpers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Simplicity First** — Use the existing timeline route, queue cache, and API wrappers. No new services, configs, or release artifacts; only required spec-kit docs are added.
2. **Code Quality Discipline** — Continue ESLint + `tsc --noEmit` + Vitest; keep changes confined to queue sorting/selection and pill UI. Any obsolete pill logic is removed in the same change.
3. **Static Delivery Mandate** — All behavior stays client-side in the Next.js app with `output: 'export'`. Data continues to load through existing headless-rss endpoints; no runtime compute or API routes.
4. **Right-Sized Tests** — Add/update Vitest coverage for queue ordering, skip/end behavior, and active selection; Playwright covers pill rendering, skip, mark-all-read, and empty states. Manual smoke is limited to responsive layout and horizontal scroll visibility.
5. **Experience Consistency** — Pills use existing typography/spacing tokens and accessible focus styles; validate contrast and keyboard navigation; capture screenshot diffs for multiple pills, single pill, and empty state.
6. **Unread-Only Focus** — Queue and timeline are built only from unread items. Mark-read removes items from cache immediately; no read articles are fetched or rendered.

## Project Structure

### Documentation (this feature)

```text
specs/004-folder-queue-pills/
├── plan.md          # This document
├── spec.md          # Approved feature specification
├── research.md      # Phase 0 decisions
├── data-model.md    # Phase 1 entity design
├── quickstart.md    # Phase 1 developer guide
├── contracts/       # Phase 1 API references
└── checklists/      # Existing requirements checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   └── timeline/
│       └── page.tsx            # Timeline layout and wiring
├── components/
│   └── timeline/
│       ├── FolderStepper.tsx   # Existing header (to be replaced/augmented by pills)
│       ├── TimelineList.tsx
│       └── EmptyState.tsx
├── hooks/
│   ├── useFolderQueue.ts        # Queue state + actions
│   └── useItems.ts
├── lib/
│   ├── storage/
│   │   └── timelineCache.ts     # Queue persistence
│   └── utils/
│       └── unreadAggregator.ts  # Sorting + aggregation helpers
└── types/
    └── folder.ts                # Folder queue entry types
```

**Structure Decision**: Continue with a single Next.js app; the feature only extends timeline components, hooks, and queue helpers already in use.

## Complexity Tracking

No constitution violations identified. All work stays within the existing static Next.js app and client-side cache.

## Post-Design Constitution Re-Check

1. **Simplicity First** ✅ — Phase 0/1 artifacts keep all changes inside the timeline UI and queue helpers; no new services or processes added.
2. **Code Quality Discipline** ✅ — Data model clarifies queue ordering and skip semantics; tests are scoped to the new pill behaviors and selection rules.
3. **Static Delivery Mandate** ✅ — Contracts reuse existing headless-rss endpoints; no server code or APIs required.
4. **Right-Sized Tests** ✅ — Planned Vitest/Playwright coverage aligns with queue sorting, skip/mark actions, and empty states; manual checks limited to responsive layout.
5. **Experience Consistency** ✅ — Pill visuals and interactions reuse existing tokens and a11y patterns; screenshot coverage called out in quickstart.
6. **Unread-Only Focus** ✅ — Data model and contracts confirm only unread items are loaded, displayed, and cached.
