# feedfront Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-10

## Active Technologies
- TypeScript 5.9 / Next.js 14.2 (App Router) on Node.js 20 LTS + Next.js, React 18, SWR, Tailwind CSS, Docker Buildx/BuildKit, Caddy 2 (runtime server), GitHub Actions, GitHub Container Registry (002-docker-deploy)
- TypeScript / Next.js 14 built with Node.js 18 LTS (runtime base: `node:18-alpine` multi-stage) + Next.js App Router, SWR, TailwindCSS, Docker multi-stage build, GitHub Actions workflow (002-docker-deploy)


- TypeScript 5.x, Node 20 LTS + Next.js 14 (static export), React 18, TailwindCSS (or CSS Modules), SWR (client fetch caching) (001-static-rss-app)

## Project Structure

```text
src/
	app/              # Next.js App Router pages
	components/       # UI components (timeline, shared UI)
	hooks/            # React hooks (auth, data fetching)
	lib/              # API clients, storage, utils, config
	styles/           # Global styles and design tokens
	types/            # Shared TypeScript types
tests/
	e2e/              # Playwright end-to-end suites
	unit/             # Vitest unit tests
	visual/           # Visual regression specs
public/             # Static assets (manifest, service worker)
specs/              # Product specs, requirements, contracts
docs/               # Release notes, metrics, other docs
```

## Commands

- Dev server: `npm run dev`
- Production build: `npm run build`
- Static export: `npm run export`
- Production runtime: `npm run start`
- Lint: `npm run lint`
- Lint with auto-fix: `npm run lint:fix`
- Type-check: `npm run typecheck`
- Format check: `npm run format:check`
- Format (auto-fix): `npm run format`
- Unit tests: `npm run test`
- Unit tests (watch): `npm run test:watch`
- Unit tests (coverage): `npm run test:coverage`
- E2E tests: `npm run test:e2e`
- E2E tests with UI: `npm run test:e2e:ui`

## Code Style

TypeScript 5.x, Node 20 LTS: Follow standard conventions

## Recent Changes
- 002-docker-deploy: Added TypeScript / Next.js 14 built with Node.js 18 LTS (runtime base: `node:18-alpine` multi-stage) + Next.js App Router, SWR, TailwindCSS, Docker multi-stage build, GitHub Actions workflow
- 002-docker-deploy: Added TypeScript 5.9 / Next.js 14.2 (App Router) on Node.js 20 LTS + Next.js, React 18, SWR, Tailwind CSS, Docker Buildx/BuildKit, Caddy 2 (runtime server), GitHub Actions, GitHub Container Registry, Trivy scanner

- 001-static-rss-app: Added TypeScript 5.x, Node 20 LTS + Next.js 14 (static export), React 18, TailwindCSS (or CSS Modules), SWR (client fetch caching)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
