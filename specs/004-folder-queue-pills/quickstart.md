# Quickstart: Folder Queue Pills

## 1. Prerequisites

- Node.js 20+
- npm (repo default)
- Headless-rss/Nextcloud News endpoint (or MSW mocks in dev)
- Modern browser for responsive testing (320-1440px)

## 2. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and log in to load the timeline.

## 3. Feature Touchpoints

1. **Pill strip**: Horizontal list replacing Unread/All pills, showing `Folder Name (Unread)`.
2. **Active selection**: The first pill is always the selected folder and is highlighted.
3. **Queue updates**: Mark-all-read removes the active folder if unread reaches zero; skip moves it to the end.
4. **Reload behavior**: Refresh or reload re-sorts by unread count (stable ties) and excludes zero-unread folders.

## 4. Test Commands

| Purpose | Command |
|---------|---------|
| Unit + hooks | `npm run test` |
| Playwright E2E | `npm run test:e2e` |
| Lint + types | `npm run lint && npm run typecheck` |

## 5. Manual Smoke Checklist

1. **Pill render**: Load timeline with multiple unread folders; verify pill labels show counts and exclude zero-unread folders.
2. **Ordering**: Confirm pills are sorted by unread count with stable ties and the active folder is first.
3. **Skip**: Click Skip; the active folder moves to the end and the next folder becomes active.
4. **Mark all read**: Click Mark All as Read; the active folder is removed if unread becomes zero and selection moves forward.
5. **Reload**: Reload the page; pills re-sort by unread count and skip ordering resets.
6. **Empty state**: With no unread folders, verify no pills and no articles render.
7. **Responsive**: At 320px width, ensure the active pill remains visible and horizontal scroll works.
