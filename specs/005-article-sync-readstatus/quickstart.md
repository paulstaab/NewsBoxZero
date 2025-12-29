# Quickstart: Article Sync Read Status

## Goal
Keep the local unread list aligned with server read status during background sync, without introducing new UI.

## Runbook

1. Start the app: `npm run dev`.
2. Authenticate and open the Timeline page.
3. Trigger a sync using the existing Update action (folder stepper refresh) or reload the page to run the automatic refresh.

## Manual Verification

1. **Reconcile read status**: Mark an unread article as read on another client, run sync, and confirm it disappears locally.
2. **Retain unread**: Leave an unread article unread on the server, run sync, and confirm it remains.
3. **Load new unread**: Add a new unread article on the server, run sync, and confirm it appears locally.
4. **Error handling**: Simulate an offline network or 500 response; verify the existing sync error toast appears and local read status remains unchanged.

## Automated Tests (Planned)

- Unit tests for reconciliation helpers (evict missing IDs, no-op when no local unread).
- Playwright E2E for sync error handling and unread refresh behavior.
