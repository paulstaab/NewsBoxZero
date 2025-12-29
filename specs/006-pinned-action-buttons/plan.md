# Implementation Plan: Pinned Action Buttons

**Branch**: `006-pinned-action-buttons` | **Date**: 2025-12-29 | **Spec**: `/workspaces/newsboxzero/specs/006-pinned-action-buttons/spec.md`
**Input**: Feature specification from `/specs/006-pinned-action-buttons/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a fixed, icon-only action cluster (Sync, Skip, Mark All Read) pinned to the bottom-right, update existing Skip/Mark All Read controls to use the same pictograms above and below the article list, and move Sync into the timeline header’s right edge while removing the status summary. Use existing unread state from the timeline cache to disable Skip/Mark All Read when no unread items remain, while keeping Sync always enabled.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 20  
**Primary Dependencies**: Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1  
**Storage**: Browser localStorage + sessionStorage (timeline cache + session/preferences)  
**Testing**: Vitest, Playwright, Testing Library, axe-core/playwright  
**Target Platform**: Web (PWA) served as static export (Next.js)  
**Project Type**: Web application  
**Performance Goals**: 60 fps UI interactions; pinned controls render without layout jank while scrolling  
**Constraints**: Offline-capable, static export only, WCAG 2.1 AA, 320px–1440px responsive range  
**Scale/Scope**: Single-user PWA; timeline UI only, no new screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Simplicity First** — UI-only changes in the timeline view; no new services, configs, or release artifacts. Documentation stays within this plan + quickstart.
2. **Code Quality Discipline** — Use existing component structure in `src/components/timeline` and `src/app/timeline`; lint/typecheck via `npm run lint:fix` and `npm run typecheck`. Keep changes scoped to button layout, icons, and disabled state logic.
3. **Static Delivery Mandate** — Remains a static Next.js export; actions reuse existing client-side APIs and cache state. No new runtime compute or API routes.
4. **Right-Sized Tests** — Primarily visual/interaction changes: manual smoke checklist in `quickstart.md` plus existing Playwright screenshot flow for header/actions; add automation only if new logic around disabled state becomes complex.
5. **Experience Consistency** — Reuse Tailwind tokens and spacing scale; ensure icon-only buttons have aria-labels + tooltips; verify at 320px and 1440px; capture before/after screenshots for header + action cluster.
6. **Unread-Only Focus** — Uses existing unread-only cache (`TimelineCacheEnvelope`) and does not surface read items. Mark-all read and skip continue to evict read content per existing logic.

**Post-Design Check**: All gates still pass after Phase 1 artifacts (no exceptions required).

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/
│   └── timeline/
├── components/
│   └── timeline/
├── hooks/
├── lib/
├── styles/
└── types/

tests/
```

**Structure Decision**: Single Next.js web app under `src/` with timeline UI in `src/app/timeline` and `src/components/timeline`.

## Complexity Tracking

No constitution violations.
