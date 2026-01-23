# Implementation Plan: Article Pop-out View

**Branch**: `009-article-popout-view` | **Date**: 2026-01-23 | **Spec**: [specs/009-article-popout-view/spec.md](specs/009-article-popout-view/spec.md)
**Input**: Feature specification from /specs/009-article-popout-view/spec.md

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the in-timeline article expansion with a modal-style pop-out that displays image (if available), heading, subheading, and full text. The pop-out uses a dimmed overlay, focus trapping, Escape and swipe-to-dismiss, and restores focus to the originating article while disabling timeline interaction. Implementation will reuse existing timeline data and UI tokens without introducing new data sources or URL state.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9 (Node.js 20)  
**Primary Dependencies**: Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1  
**Storage**: Browser localStorage + sessionStorage (timeline cache, session/preferences)  
**Testing**: Vitest (unit), Playwright (e2e), ESLint + TypeScript typecheck  
**Target Platform**: Modern browsers (PWA)  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: Maintain smooth 60 fps scrolling and avoid layout shifts when opening the pop-out  
**Constraints**: Static export; client-only UI state; offline-capable for cached timeline  
**Scale/Scope**: Single-user PWA, focused on timeline reading

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Simplicity First** — Single-user UI change only; no new services, endpoints, or documentation artifacts beyond plan outputs.
2. **Code Quality Discipline** — Use existing lint/typecheck; keep changes scoped to timeline detail view and modal primitives only.
3. **Static Delivery Mandate** — Pop-out is client-side UI state; no runtime compute or URL changes; static export remains unchanged.
4. **Right-Sized Tests** — Add unit coverage for pop-out open/close and focus trap if practical; otherwise document manual smoke steps for modal interactions.
5. **Experience Consistency** — Reuse Tailwind tokens, confirm WCAG focus management, and validate responsive behavior across 320–1440px.
6. **Unread-Only Focus** — Pop-out only displays articles already present in the unread timeline; no read article retrieval or storage changes.

## Project Structure

### Documentation (this feature)

```text
specs/009-article-popout-view/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/
│   ├── timeline/
│   └── login/
├── components/
│   └── timeline/
├── hooks/
├── lib/
├── styles/
└── types/

tests/
├── unit/
├── e2e/
└── visual/
```

**Structure Decision**: Web application layout in src/app with shared UI and hooks in src/components and src/hooks; tests in tests/unit, tests/e2e, and tests/visual.

## Complexity Tracking

No constitution violations identified.

## Constitution Check (Post-Design)

All gates remain satisfied after Phase 1 design outputs. No exceptions or RFCs required.
