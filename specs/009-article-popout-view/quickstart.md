# Quickstart: Article Pop-out View

## Prerequisites

- Node.js 20
- npm

## Run locally

1. Install dependencies:
   - `npm install`
2. Start the dev server:
   - `npm run dev`
3. Open the timeline view and select an article.
4. Verify the pop-out shows image (if available), heading, subheading, and full text.
5. Verify dismissal via close button, outside click, Escape, and swipe (touch).
6. Confirm timeline interactions (scroll, click, keyboard navigation) are blocked while the pop-out is open.
7. Confirm the pop-out scrolls independently and the page background does not scroll.

## Tests (recommended)

- `npm run lint:fix`
- `npm run typecheck`
- `npm run test`
- `npx playwright test`
