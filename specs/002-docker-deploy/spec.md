# Feature Specification: Docker Container Deployment

**Feature Branch**: `[002-docker-deploy]`  
**Created**: 2025-12-12  
**Status**: Draft  
**Input**: User description: "add docker container. prepare this app for being deployed as a docker container. build a small containers that servers this app on port 8000. make sure that it is as small as possible. it must support being run as a non-root user. the file-system should be read-only then. build this container in a deploy step in the ci pipeline for main. push it to the repos github container registry with tag latest. do not add tests for the container, it is fine without."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI publishes production container (Priority: P1)

The release engineer needs the main branch pipeline to build the application container and push the artifact to the GitHub Container Registry with the `latest` tag whenever main is green.

**Why this priority**: Without a reliable artifact from CI, no other environment can consume the container, blocking deployment readiness.

**Independent Test**: Trigger the main-branch deploy workflow on a staging commit and verify that a GHCR image tagged `latest` is produced with the expected metadata captured in the workflow summary.

**Acceptance Scenarios**:

1. **Given** a successful main branch build, **When** the deploy job runs, **Then** a container image tagged `latest` is published to GHCR with digest metadata recorded in the workflow summary.
2. **Given** the deploy job runs, **When** it completes, **Then** the workflow surfaces success or failure in CI logs without adding extra size/security gates beyond the existing application tests.

---

### User Story 2 - Platform team runs container non-root (Priority: P2)

An infrastructure operator must be able to run the published container on port 8000 using a non-root user and a read-only filesystem while still allowing the app to persist required runtime files via explicitly documented writable mounts.

**Why this priority**: Running as non-root with a read-only root filesystem reduces attack surface and is a contractual requirement for deployment in security-hardened environments.

**Independent Test**: Launch the container with default security flags (non-root, `readOnlyRootFilesystem=true`) in a sandbox cluster and confirm the service responds on port 8000 without requesting elevated privileges.

**Acceptance Scenarios**:

1. **Given** the operator runs `docker run` (or equivalent) with the container user set to any non-root UID (including values different from the packaged default), **When** the container starts, **Then** the process binds to port 8000 and serves the compiled application without permission errors.
2. **Given** the root filesystem is mounted read-only, **When** the application needs to write cache or logs, **Then** it uses a documented writable path (tmpfs or mounted volume) without crashing.



### Edge Cases

- Registry credentials are missing or rotated, causing push failures; workflow must halt with actionable remediation guidance.
- The container requires temporary writable directories despite the read-only requirement; acceptable mount points must be documented to prevent crashes.
- Non-root UID conflicts with host policies; the container must tolerate arbitrary non-root UID assignments supplied by operators.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Provide a container definition that packages the production build of the app and exposes port 8000 as the single ingress point.
- **FR-002**: The container must run as any non-root user (random UID) and succeed with the root filesystem mounted read-only, limiting default writable access to `/tmp` (tmpfs).
- **FR-003**: The main-branch deploy workflow must build the container image and publish it to the GitHub Container Registry namespace for this repo with the `latest` tag.
- **FR-004**: The pipeline must skip adding new container-specific automated tests while confirming existing application tests still run prior to the container step, aligning with the “no new tests” directive.
- **FR-005**: Access to GHCR push credentials must be limited to the deploy workflow, with clear rotation instructions to maintain supply-chain security.
- **FR-006**: The resulting container image must be ≤150 MB compressed (GHCR reported size) to keep the deployment artifact lean.

### Key Entities *(include if feature involves data)*

- **Container Image Artifact**: Immutable package containing the production build, exposed port configuration, non-root user metadata, and labels for commit SHA, build date, and image size.
- **Deploy Workflow Configuration**: CI definition responsible for building, tagging, and publishing the container with conditional execution on `main`.

## Experience & Performance Standards *(mandatory)*

- **Static Build Strategy**: Build the site with `next build && next export`, then serve the exported static assets inside the container with a lightweight static web server (e.g., `npx serve`), documenting the exact commands and environment required to reproduce that flow outside CI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Main-branch deploy workflow produces a GHCR image tagged `latest` within 12 minutes of merge completion in 95% of runs.
- **SC-002**: Operators can start the container with non-root and read-only filesystem flags and receive a healthy response on port 8000 within 30 seconds of launch.
- **SC-003**: GHCR `latest` tag is updated for every main-branch merge with zero failed publish attempts over a rolling 30-day period, or failures automatically block release until resolved.
- **SC-004**: Each GHCR publish records a compressed image size at or below 150 MB in the workflow summary, blocking release if the budget is exceeded.

## Assumptions

- CI/CD continues to run on GitHub-hosted infrastructure with permissions to push to GHCR under the existing organization.
- Single architecture target ($\text{linux/amd64}$) is sufficient for the initial release; additional architectures can be added later without changing this spec.
- Existing automated application tests (unit, e2e, accessibility) remain mandatory preconditions for the deploy workflow, but no new container-specific tests will be introduced per the request.
- Runtime environments can provide external writable volumes (tmpfs or hostPath) when the app needs temporary storage under a read-only root filesystem.

## Clarifications
### Session 2025-12-12
- Q: For read-only root filesystem compliance, which runtime directory should remain writable by default? → A: We are serving a static site. If the webserver really needs write-access, ensure that it is under the `/tmp` directory. It is okay to have the `/tmp` writable in the container filesystem in this case, but also mount a tmpdir to `/tmp` of the container in the documentation.
### Session 2025-12-13
- Q: How should the container serve the Next.js app at runtime? → A: Use `next build && next export`, then serve the exported static assets via a minimal static server such as `npx serve` inside the container.
- Q: What is the maximum acceptable container image size? → A: Target ≤150 MB compressed per GHCR reporting.
