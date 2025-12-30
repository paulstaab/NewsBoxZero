# Implementation Plan: Improve Timeline Article Cards

**Branch**: `[007-improve-article-cards]` | **Date**: 2025-12-30 | **Spec**: /workspaces/newsboxzero/specs/007-improve-article-cards/spec.md
**Input**: Feature specification from `/specs/007-improve-article-cards/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Revise timeline article cards to present a clearer title/link, metadata line, excerpt, and optional thumbnail in collapsed state, plus an expandable full-content view that marks items as read using existing API mutations while retaining visibility until the next sync.

## Technical Context

**Language/Version**: TypeScript 5.9 (Node.js 20)  
**Primary Dependencies**: Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1  
**Storage**: Browser localStorage + sessionStorage (timeline cache, session/preferences)  
**Testing**: Vitest + React Testing Library + Playwright (+ axe)  
**Target Platform**: Web (PWA), modern browsers 320px-1440px  
**Project Type**: Web (single Next.js app)  
**Performance Goals**: Smooth 60fps interactions, fast timeline render with minimal layout shift  
**Constraints**: Static export compatible (`npm run build && npm run export`), no new runtime services, offline-friendly timeline cache  
**Scale/Scope**: Single-user app; timeline lists of unread articles

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Simplicity First** — Scoped to a single UI component update (timeline cards) with no new services, docs, or processes beyond the spec artifacts.
2. **Code Quality Discipline** — Use existing lint/typecheck scripts (`npm run lint`, `npm run typecheck`), keep changes isolated to timeline components/hooks, and add concise comments only for non-obvious click-handling logic.
3. **Static Delivery Mandate** — UI-only changes on top of existing client-side data fetches; no new runtime compute or APIs introduced; static export flow remains unchanged.
4. **Right-Sized Tests** — Add/adjust unit tests for ArticleCard layout and expansion behavior; manual smoke check for visual layout/thumbnail alignment and click behavior.
5. **Experience Consistency** — Reuse Tailwind tokens/spacing, ensure link focus states and keyboard navigation, and verify responsive layout at 320px and 1440px with visual diffs.
6. **Unread-Only Focus** — Uses existing unread-only item fetch. Cards marked read on expand remain visible until next sync, then are evicted per sync reconciliation; no read items are fetched or retained beyond that window.

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
├── app/
├── components/
├── hooks/
├── lib/
├── styles/
└── types/

tests/
```

**Structure Decision**: Single Next.js app under `src/` with shared UI components and hooks; tests live under `tests/` (Vitest/Playwright).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
