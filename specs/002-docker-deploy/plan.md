# Implementation Plan: Docker Container Deployment

**Branch**: `002-docker-deploy` | **Date**: 2025-12-13 | **Spec**: [specs/002-docker-deploy/spec.md](specs/002-docker-deploy/spec.md)
**Input**: Feature specification from `/specs/002-docker-deploy/spec.md`

## Summary

Build a minimum-footprint Docker image that serves the statically exported Next.js app on port 8000 and publish it from the main-branch CI pipeline to GHCR with the `latest` tag. The container must run as any non-root user with a read-only root filesystem (only `/tmp` writable) and stay at or below 150 MB compressed. No new automated tests are required; instead, the existing application test suite continues to gate deployments before the container build and push steps.

## Technical Context

**Language/Version**: TypeScript / Next.js 14 built with Node.js 18 LTS (runtime base: `node:18-alpine` multi-stage)  
**Primary Dependencies**: Next.js App Router, SWR, TailwindCSS, Docker multi-stage build, GitHub Actions workflow  
**Storage**: N/A (static assets served from image)  
**Testing**: Existing Vitest + Playwright suites (no new container-specific tests per spec)  
**Target Platform**: Linux amd64 container running under Docker / OCI runtimes  
**Project Type**: Single front-end web app  
**Performance Goals**: Container image ≤150 MB compressed; CI publish ≤12 minutes post-merge  
**Constraints**: Run as arbitrary non-root UID, read-only root FS with only `/tmp` writable, serve static export via lightweight HTTP server, no new automated tests, GHCR push authenticated via deploy workflow secrets  
**Scale/Scope**: Single-user PWA, single container artifact per merge, one CI workflow extension

## Constitution Check

1. **Simplicity First** — Prefer a two-stage Dockerfile (builder + runtime) without extra services. Reuse existing build commands and avoid introducing release playbooks or additional pipelines. Document run instructions inside the plan and quickstart.
2. **Code Quality Discipline** — Lint/type-check already enforced before building. Dockerfile kept under 50 lines with comments for non-obvious steps. Remove any unused scripts created during this effort.
3. **Static Delivery Mandate** — Use `next build && next export` to generate immutable `/out`, then copy to a minimal runtime image (e.g., `node:18-alpine` with `npx serve` or `nginx:alpine`). No server-side rendering or custom APIs introduced.
4. **Right-Sized Tests** — Reuse existing Vitest/Playwright suites in CI prior to container build. Document manual verification steps (running container locally with non-root UID and read-only root) to satisfy coverage without adding new automated tests.
5. **Experience Consistency** — Static export already honors tokens and responsiveness; containerization does not change UI, but we will confirm that exported assets originate from the same code paths (no alternate styling).

All gates satisfied without exceptions.

## Project Structure

```text
specs/
├── 001-mvp-web-app/
└── 002-docker-deploy/
    ├── plan.md          # this file
    └── spec.md

src/
└── app/, components/, lib/, etc. (existing Next.js app)

.github/
└── workflows/
    └── deploy.yml (new or updated CI workflow for container build + push)

Dockerfile (new, repo root)
```

**Structure Decision**: Single repo, single Dockerfile at project root, and an updated GitHub Actions workflow under `.github/workflows/deploy.yml`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phases

### Phase 0 – Research & Decisions
- Resolve runtime image choice and final container entrypoint (e.g., `node:18-alpine` + `npx serve` vs `caddy` vs `nginx`).
- Confirm minimal package installations required to serve static assets (likely just `serve` npm package installed via `pnpm dlx` or vendored).
- Document manual verification checklist (non-root UID, read-only FS, `/tmp` mount instructions).

**Deliverables**: `specs/002-docker-deploy/research.md` summarizing image base decision, security posture, and CI credential handling.

### Phase 1 – Design & Contracts
- Author `data-model.md` (container artifact metadata + workflow structure).
- Define contracts (e.g., `contracts/container.md`) capturing GHCR tag naming, labels, and workflow outputs.
- Update `quickstart.md` with steps to build/export locally, run the container as non-root, and mount `/tmp` as writable.
- Run `.specify/scripts/bash/update-agent-context.sh copilot` after capturing new tech (Docker, GHCR workflow additions).

### Phase 2 – Implementation Prep
1. **Dockerfile**
   - Multi-stage: builder (Node 18) runs `npm ci && npm run build && npm run export` (or `next build && next export`).
   - Runtime: lightweight base (Alpine) copies `/out`, installs `serve`, sets `USER 65532`, exposes `8000`, CMD `npx serve -s /app -l 8000`.
   - Mark `/tmp` as writable; set `ENV PORT=8000`.
2. **Entrypoint script (optional)**
   - Only if we need to remap UID/GID or pre-create writable dirs.
3. **GitHub Actions Workflow**
   - Reuse existing build/test jobs; add `docker buildx build --platform linux/amd64 --push ghcr.io/<org>/<repo>:latest` gated on `main`.
   - Inject `GHCR_PAT` or use `GITHUB_TOKEN` with `packages:write` scope.
   - Capture image digest + size in workflow summary.
4. **Docs**
  - `docs/releases/docker.md`: dedicated container runbook with non-root instructions, `docker run --user 1234 --read-only --tmpfs /tmp:rw` example, and GHCR pull guidance.

### Phase 3 – Verification & Handoff
- Manual checklist: run image locally with `--user 1234 --read-only --tmpfs /tmp:rw` and hit `http://localhost:8000`.
- Confirm GHCR image ≤150 MB via `docker buildx imagetools inspect` or GHCR UI; include in workflow summary.
- Provide quickstart snippet for operators.

### Risks & Mitigations
- **Image size >150 MB** → use `node:18-alpine` or `caddy` static base; remove dev dependencies during build.
- **Non-root UID mismatch** → avoid using `chown` at runtime; rely on `/tmp` only and document tmpfs mount.
- **CI credentials** → store PAT in GitHub Actions secret `GHCR_PUSH_TOKEN`; limit usage to deploy workflow.
- **Read-only root FS** → ensure server writes nothing outside `/tmp`; test with `docker run --read-only` locally.

### Manual Verification Checklist (Right-Sized Tests)
1. Build image locally via `docker build -t feedfront:latest .`.
2. Run `docker run --rm --user 1001 --read-only --tmpfs /tmp:rw -p 8000:8000 feedfront:latest`.
3. Hit `http://localhost:8000` and verify static site renders.
4. Inspect container logs for write attempts outside `/tmp`.
5. Check `docker image ls` to confirm size ≤150 MB.

### CI Workflow Outline
```yaml
name: deploy
on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-22.04
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci && npm run lint && npm run test && npm run build && npm run export
      - run: docker buildx build --platform linux/amd64 -t ghcr.io/<org>/<repo>:latest --push .
      - run: docker buildx imagetools inspect ghcr.io/<org>/<repo>:latest >> $GITHUB_STEP_SUMMARY
```

*(Exact workflow/command details to be finalized during implementation.)*
