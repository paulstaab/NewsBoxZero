# NewsBoxZero Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-28

## Active Technologies

- TypeScript 5.9 (Node.js 20) + Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1 (007-improve-article-cards)
- Browser localStorage + sessionStorage (timeline cache, session/preferences) (007-improve-article-cards)

- TypeScript 5.9, Node.js 20 + Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1 (006-pinned-action-buttons)

- TypeScript 5.9 on Node.js 20 + Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1 (005-article-sync-readstatus)
- Browser localStorage + sessionStorage (timeline cache + session/preferences) (005-article-sync-readstatus)

- TypeScript 5.9 on Node.js 20 (Next.js App Router) + Next.js 16 (static export), React 19, SWR, Tailwind CSS, date-fns (004-folder-queue-pills)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

```bash
npm run lint:fix      # Run ESLint
npm run typecheck     # Run TypeScript type checking
npm run format        # Auto-format all files
npm run test          # Run unit tests
npm run test:e2e      # Run end-to-end tests
```

## Code Style

TypeScript 5.9 on Node.js 20 (Next.js App Router): Follow standard conventions

## Recent Changes

- 007-improve-article-cards: Added TypeScript 5.9 (Node.js 20) + Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1

- 006-pinned-action-buttons: Added TypeScript 5.9, Node.js 20 + Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1

- 005-article-sync-readstatus: Added TypeScript 5.9 on Node.js 20 + Next.js 16 (App Router, static export), React 19, SWR 2.3, Tailwind CSS 4.1, date-fns 4.1

<!-- MANUAL ADDITIONS START -->

## Comments and Documentation

- Use short comments to indicate the purpose of code blocks
- Use JSDoc/TSDoc comments above functions, classes, and React components to document parameters, returns, and behavior.

## Screenshots

Use the capture scripts `./scripts/capture-timeline.sh` and `./scripts/capture-login-page.sh` to create screenshot.
This requires network access and must run outside ouf any sandbox.

<!-- MANUAL ADDITIONS END -->
