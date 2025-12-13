# Tasks: Docker Container Deployment

**Input**: Design documents from `/specs/002-docker-deploy/`
**Prerequisites**: plan.md, spec.md

## Phase 0: Research & Decisions

- [ ] T001 [P] Capture the final runtime base image (`node:18-alpine`) and static server selection in specs/002-docker-deploy/research.md
- [ ] T002 Document GHCR credential scope, secret names, and rotation playbook in specs/002-docker-deploy/research.md
- [ ] T003 [P] Record the manual verification checklist (non-root UID, read-only root, `/tmp` tmpfs, ≤30 s startup) in specs/002-docker-deploy/research.md

## Phase 1: Design Artifacts

- [ ] T004 [P] Describe the container artifact metadata and workflow outputs in specs/002-docker-deploy/data-model.md
- [ ] T005 Define contracts/container.md covering GHCR tag naming, digest/size summary fields, and failure messaging requirements
- [ ] T006 [P] Expand specs/002-docker-deploy/quickstart.md with build/export instructions and `docker run --read-only --tmpfs /tmp:rw` usage notes
- [ ] T007 Create docs/releases/docker.md as the dedicated runbook for operators (non-root guidance, GHCR pull commands, troubleshooting)
- [ ] T008 Run `.specify/scripts/bash/update-agent-context.sh copilot` to register Docker/GHCR context for downstream agents

## Phase 2: Setup (Shared Infrastructure)

- [ ] T009 Add `.dockerignore` at repo root to exclude node_modules, tests, `.next`, and cache directories from image builds
- [ ] T010 Outline the multi-stage Dockerfile skeleton (comments + TODOs) at Dockerfile to mirror builder/runtime phases before implementation
- [ ] T011 Link docs/releases/docker.md from README.md (deployment section) so operators can find the runbook easily

## Phase 3: User Story 1 - CI publishes production container (Priority: P1)

- [ ] T012 [US1] Implement the builder stage in Dockerfile (Node 18) running `npm ci && npm run build && npm run export` to produce `/out`
- [ ] T013 [US1] Implement the runtime stage using `node:18-alpine`, copy `/out`, install `npx serve`, set `USER 65532`, expose port 8000, and restrict writes to `/tmp`
- [ ] T014 [US1] Ensure `.github/workflows/deploy.yml` runs `npm run lint` and `npm run test` before any Docker build step to honor the “no new tests” directive
- [ ] T015 [US1] Add a `docker buildx build --platform linux/amd64 --push ghcr.io/<org>/<repo>:latest` job gated on `main` with GHCR auth sourced from encrypted secrets
- [ ] T016 [US1] Emit digest, compressed size (≤150 MB), and success/failure context to `$GITHUB_STEP_SUMMARY` and CI logs for every publish
- [ ] T017 [US1] Update secrets documentation (README or docs/releases/docker.md) to call out the exact GitHub Actions secret names powering GHCR push

## Phase 4: User Story 2 - Platform team runs container non-root (Priority: P2)

- [ ] T018 [US2] Provide tested `docker run` examples (arbitrary UID, read-only root, tmpfs `/tmp`) in specs/002-docker-deploy/quickstart.md and docs/releases/docker.md
- [ ] T019 [US2] Execute local validation with `docker run --rm --user 1234 --read-only --tmpfs /tmp:rw -p 8000:8000 ghcr.io/<org>/<repo>:latest`, measure time to first healthy response (<30 s), and record results in quickstart.md
- [ ] T020 [US2] Document acceptable writable mount points, failure modes, and mitigation steps in docs/releases/docker.md

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T021 Clean up any temporary build artifacts or helper scripts introduced during container work
- [ ] T022 [P] Validate `.specify` automation (plan/spec/tasks) references the new docs/releases/docker.md and update links if needed
- [ ] T023 Verify final image size via `docker buildx imagetools inspect` and persist the value under docs/metrics/bundle.md to demonstrate SC-004 compliance

## Dependencies & Execution Order

- Phase 0 research must be completed before design artifacts.
- Phase 1 deliverables unblock setup and user stories.
- Setup (Phase 2) must finish before User Story 1 work begins.
- User Story 1 must complete before User Story 2 validation tasks.
- Polish tasks run after both user stories are complete.
