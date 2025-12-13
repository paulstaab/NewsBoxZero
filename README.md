# feedfront

A static webapp frontend for headless-rss

> **✨ Vibe-coded with [spec-kit](https://github.com/github/spec-kit)** — This entire application was built using AI-driven specification-first development, from requirements through implementation.

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
npm install
```

This will automatically set up Git hooks via husky.

### Git Hooks

This project uses [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality standards before commits.

The pre-commit hook automatically:

- **Lints** JavaScript/TypeScript files with ESLint (and auto-fixes issues)
- **Type-checks** TypeScript files with `tsc --noEmit`
- **Formats** code with Prettier

To manually run these checks:

```bash
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript type checking
npm run format:check  # Check formatting
npm run format        # Auto-format all files
```

To bypass the pre-commit hook (not recommended):

```bash
git commit --no-verify
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run typecheck` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run test` - Run unit tests
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with UI

## Deployment

The CI workflow builds and publishes a production container to GHCR whenever `main` is green. See [docs/releases/docker.md](docs/releases/docker.md) for pull/run commands, non-root guidance, and credential notes.
