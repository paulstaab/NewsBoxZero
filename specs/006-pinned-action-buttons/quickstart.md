# Quickstart: Pinned Action Buttons

## Goal
Provide always-available, icon-only action controls (Sync, Skip, Mark All Read) with correct disabled states, and place Skip/Mark All Read controls both above and below the timeline list.

## Runbook

1. Start the app: `npm run dev`.
2. Authenticate and open the Timeline page.
3. Scroll the list to confirm the pinned action cluster stays fixed in the bottom-right corner.

## Manual Verification

1. **Pinned cluster order and icons**: Confirm Sync (rotate) is on top, Skip (forward-step) in the middle, Mark All Read (double-check) at the bottom. Icons are textless with aria-label + tooltip.
2. **Disabled state**: With all items read, verify Skip and Mark All Read are greyed out and do not respond to mouse or keyboard activation, while Sync remains enabled.
3. **Enabled state**: With at least one unread item, verify Skip and Mark All Read are enabled and clickable.
4. **Top/bottom controls**: Confirm Skip and Mark All Read appear above and below the article list, aligned right, using the same icons.
5. **Header change**: Confirm Sync appears on the right side of the timeline header and the previous status summary is removed.
6. **Responsive check**: At 320px width, confirm the pinned cluster can overlap content without layout breaks.

## Visual Regression Notes

- Capture snapshots for the timeline header, pinned cluster, and top/bottom action rows using the existing visual regression flow.
