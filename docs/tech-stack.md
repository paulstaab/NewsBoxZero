# Tech Stack

## Purpose

This document lists the technology and tooling currently used by NewsBoxZero.

## Product Shape

- Static web frontend for a headless RSS backend
- Nextcloud News v1.3 API consumer
- Progressive Web App with client-side caching, install prompt handling, and service worker registration

## Language And Runtime

- TypeScript 5.9
- Node.js 24+
- React 19

## Application Framework

- Next.js 16, App Router
- Static-export oriented frontend architecture
- Client-rendered data fetching for authenticated backend access

## Data Fetching And State

- SWR 2.4 for client-side data fetching and cache coordination
- React context for auth/session state
- Browser `localStorage` and `sessionStorage` for session persistence, timeline cache, install prompt cooldown, and lightweight preferences

## Styling And UI

- Tailwind CSS 4.1
- Global CSS in `src/styles/globals.css`
- Shared design tokens in `src/styles/tokens.css`
- `date-fns` 4.1 for relative time labels
- `next/image` for article thumbnails where available
- Font Awesome icons for some action affordances

## API Integration

- HTTP Basic Auth against the Nextcloud News v1.3 API under `/index.php/apps/news/api/v1-3`
- Typed API wrappers under `src/lib/api/`
- Client-side session normalization and validation before authenticated requests

## PWA And Browser Platform Features

- Web app manifest in `public/manifest.json`
- Service worker registration in the app shell
- Browser `beforeinstallprompt` and `appinstalled` handling
- Online/offline detection through browser events
- Performance marks for timeline cache and refresh timing

## Testing And Quality

- Vitest 4 for unit tests
- Testing Library for React component and hook tests
- Playwright for end-to-end and visual regression tests
- `@axe-core/playwright` for accessibility checks
- MSW 2 for API mocking in tests
- ESLint 9 and Prettier 3 for linting and formatting

## Build And Tooling

- npm-based scripts for linting, type checking, unit tests, e2e tests, and formatting
- Husky and lint-staged for pre-commit automation
- Static asset serving and export behavior configured through Next.js and repo scripts
