# Quickstart: Timeline Scroll & Hotkeys Development

**Feature**: 008-timeline-scroll-hotkeys  
**Date**: 2026-01-21

Quick steps to implement, test, and verify the feature.

---

## Setup

Install dependencies (already done in repo):

```bash
npm install
```

---

## Development

Start dev server:

```bash
npm run dev
```

Navigate to timeline view and test:

1. **Docking**: Scroll down past the folder queue; confirm it sticks to the top.
2. **Auto mark-read**: Scroll articles past the top edge; confirm they flip to read state and stay visible.
3. **Keyboard**: Press Arrow Down on focused timeline; first press selects top article (visual feedback); subsequent presses navigate.
4. **Focus guard**: Click a search input, press arrow keys; confirm they don't navigate articles.

---

## Key Files

- `src/hooks/useTimelineSelection.ts`: Selection state & navigation (new or extended).
- `src/hooks/useFolderQueueDocking.ts`: Docking state with ResizeObserver (new).
- `src/hooks/useAutoMarkReadOnScroll.ts`: IntersectionObserver for top-edge crossing (new).
- `src/components/timeline/Timeline.tsx`: Main component; integrates hooks and handlers.
- `src/components/timeline/FolderQueue.tsx`: Sticky-positioned folder controls.
- `src/styles/tokens.css`: Ensure selection color token exists; add if missing.

---

## Test Commands

```bash
# Unit tests for new hooks
npm run test -- useTimelineSelection useAutoMarkReadOnScroll useFolderQueueDocking

# E2E tests for user flows
npm run test:e2e -- timeline-scroll-hotkeys.spec.ts

# Visual regression
npm run test:e2e -- timeline-scroll-hotkeys.spec.ts --update-snapshots

# Type check
npm run typecheck

# Lint & format
npm run lint:fix
npm run format
```

---

## Test Scenarios Checklist

### Docking
- [ ] Scroll past folder queue; confirm `position: sticky` kicks in.
- [ ] Resize queue height dynamically; timeline margin adjusts.
- [ ] Scroll back up; queue unsticks smoothly.

### Auto mark-as-read
- [ ] Single article scrolls past top; marked read within 0.5s.
- [ ] Rapid scroll (10+ articles); all crossed articles marked read.
- [ ] Marked articles remain visible until reload.
- [ ] Reload page; marked articles disappear (fresh fetch with getRead=false).

### Keyboard Navigation
- [ ] No selection initially; press Arrow Down → top article selected (visual).
- [ ] Press Arrow Down again → next article selected, previous marked read.
- [ ] Press Arrow Up → previous article selected.
- [ ] On first article, press Arrow Up → stay on first (no wrap).
- [ ] Selection lost on scroll with mouse (deselect should mark read if logic includes it).

### Focus Guard
- [ ] Click search input; press Arrow Down → no navigation (still in search).
- [ ] Click timeline; press Arrow Down → navigation works.
- [ ] Tab to search, type; arrow keys type characters, not navigate.

### Responsive
- [ ] 320px: queue docks, doesn't overlap text.
- [ ] 768px: queue docks, timeline adjusts.
- [ ] 1440px: queue docks, all readable.

---

## Debugging Tips

- Use React DevTools to inspect selection state.
- Open DevTools Network tab to see mark-read API calls during scroll/keyboard.
- Slow down scroll in DevTools to watch IntersectionObserver fire.
- Check `console.log` for debounce batches and mutation enqueuing.
- Test with screen reader (NVDA, JAWS) to confirm aria-selected and focus order.

---

## Integration Notes

- **Existing mutation queue**: Reuse `src/lib/sync/mutations.ts` or existing pattern; no new queue.
- **Existing read API**: Call `api.items.markRead(id)` reused from spec 001.
- **Unread-only fetch**: Keep `getRead=false` default; don't fetch historical reads.
- **Offline**: Mutation queue handles offline queuing; UI reflects optimistic read immediately.

---

## Performance Targets

- **Docking**: Smooth 60fps using native CSS sticky (no custom scroll handlers).
- **Auto mark-read**: <500ms from scroll past top to mutation enqueue.
- **Keyboard nav**: <16ms (60fps) for selection update and scroll-into-view.
- **Debounce**: 100ms batch for mark-read during rapid scroll to avoid mutation spam.
