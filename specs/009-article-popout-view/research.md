# Research: Article Pop-out View

**Date**: 2026-01-23

## Decision 1: Use ARIA dialog semantics with focus trap and Escape close

**Decision**: Implement the pop-out as an ARIA-compliant dialog with `role="dialog"`, `aria-modal="true"`, focus trap, and Escape-to-close.
**Rationale**: Ensures keyboard users cannot interact with the timeline while the pop-out is open and aligns with WCAG expectations.
**Alternatives considered**: Native `<dialog>` element (built-in focus trapping) was considered but deferred to keep styling and behavior consistent with the existing component system.

## Decision 2: Store and restore focus to the originating article

**Decision**: Capture the previously focused article element on open and restore focus when the pop-out closes.
**Rationale**: Preserves user context and meets accessibility best practices for modal flows.
**Alternatives considered**: Returning focus to the timeline container or allowing browser default focus restoration.

## Decision 3: Dimmed overlay with outside-click dismissal

**Decision**: Render a dimmed overlay behind the pop-out and close on outside click.
**Rationale**: Reinforces modal state, communicates disabled background, and provides an intuitive dismissal pathway.
**Alternatives considered**: No overlay; close-only via explicit button.

## Decision 4: Lock background scroll and isolate pop-out scroll

**Decision**: Prevent body/timeline scrolling while the pop-out is open and provide a scrollable content area inside the pop-out.
**Rationale**: Avoids scroll bleed and ensures consistent reading behavior for long articles.
**Alternatives considered**: Allow background scroll with overlay; rely on CSS alone without body locking.

## Decision 5: Swipe-to-dismiss with guardrails

**Decision**: Support swipe-up dismissal on touch devices only when the user is at the top of the pop-out content and crosses a distance/velocity threshold.
**Rationale**: Prevents accidental dismissal while scrolling content and keeps behavior discoverable via the close button.
**Alternatives considered**: Always allow swipe regardless of scroll position; disable swipe entirely.
