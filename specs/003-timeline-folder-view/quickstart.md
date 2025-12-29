# Quickstart: Folder-Based Timeline View

## 1. Prerequisites

- Node 20.x (matches `.nvmrc`)
- pnpm 9.x or npm 10.x (repo uses npm scripts by default)
- A headless-rss instance reachable over HTTPS (or MSW mocks via `npm run dev`)
- Modern Chrome/Firefox for testing offline/service-worker features

## 2. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. The service worker registers automatically in development. Use the login screen to provide your headless-rss base URL and credentials.

## 3. Working on the Folder Timeline

1. **Seed dummy data**: Enable MSW by running `npm run dev` (already configured). The `tests/mocks` handlers return sample feeds/folders/items so you can exercise the UI without a live backend.
2. **Toggle timeline cache**: Use DevTools → Application → Local Storage → `newsboxzero.timeline.v1` to inspect or reset the cached unread queue.
3. **Debug performance metrics**: Open the console to see `performance.measure` logs for `timeline-cache-ready` and `timeline-update-complete`.
4. **Offline simulation**: In DevTools → Network, check "Offline" and reload the timeline. You should still see cached articles plus the offline banner.

## 4. Test Commands

| Purpose | Command |
|---------|---------|
| Unit + hooks | `npm run test:unit` (Vitest) |
| Playwright E2E (headless) | `npx playwright test tests/e2e/timeline-folders.spec.ts` |
| Visual baselines | `npx playwright test tests/visual --update-snapshots` |
| Lint & types | `npm run lint && npm run typecheck` |

Playwright tests rely on the same MSW mocks; no external network is required.

## 5. Manual Smoke Checklist

1. **Folder Ordering**: Load the timeline; verify the highest-unread folder appears with newest article on top.
2. **Article Details**: Expand an article card; confirm it reveals full text, disappears from the unread badge, and is marked read in API logs.
3. **Mark All as Read**: Click **Mark All as Read**; the next folder should appear instantly.
4. **Skip Folder**: Click **Skip** on a folder; the next folder loads while the skipped one is moved to the end of the queue.
5. **Restart Queue**: After skipping/viewing all folders, confirm the "All folders viewed" screen appears. Click **Restart** to revisit skipped folders.
6. **Updates**: Click **Update**; fresh articles append without losing current unread ones.
7. **Offline**: Disconnect network; verify cached articles and folders are still accessible.

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Timeline blank after login | Clear `newsboxzero.timeline.v1` and `newsboxzero:session` entries; then reload. |
| Articles never mark as read | Ensure CORS allows `POST /items/*`; check console for 401/403. |
| Update button spins forever | Run `npm run dev -- --logLevel debug` to see SWR errors; network tab should show failing `/items` call. |
| Service worker cache stale | In DevTools → Application → Service Workers, click "Skip waiting" then reload.
