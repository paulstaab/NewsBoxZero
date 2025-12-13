# Research — Docker Container Deployment

## Runtime Base & Static Server
- **Decision**: Use `node:18-alpine` for both builder (with pnpm/npm tools) and runtime stages, installing the `serve` package at runtime to host `/app`.
- **Rationale**: Keeps parity with the existing Next.js toolchain, keeps OpenSSL/glibc compatibility, and produces images <150 MB when paired with `apk --no-cache` cleanup.
- **Alternatives Considered**:
  - `caddy:2-alpine` — great for static assets but would require multi-stage copying and adds another binary to maintain; rejected to avoid extra tooling.
  - `nginx:alpine` — lightweight but needs custom config and user remapping for non-root port 8000; more moving parts for single maintainer.

## GHCR Credentials & Rotation
- **Secret**: `GHCR_PUSH_TOKEN` stored as a GitHub Actions repository secret with `packages:write` + `contents:read` scopes.
- **Usage**: Deploy workflow logs into `ghcr.io/<org>/<repo>:latest` via `docker/login-action` using the PAT, only on `main` pushes.
- **Rotation Process**:
  1. Maintainer generates new PAT with identical scopes.
  2. Update the `GHCR_PUSH_TOKEN` secret.
  3. Trigger a workflow dispatch to confirm push succeeds; roll back the secret if it fails.
  4. Document the rotation date inside docs/releases/docker.md.

## Verification Checklist (Manual)
1. `npm ci && npm run build && npm run export` locally to ensure `/out` exists before Docker build.
2. `docker build -t feedfront:latest .` using the multi-stage Dockerfile.
3. `docker run --rm --user 1234 --read-only --tmpfs /tmp:rw -p 8000:8000 feedfront:latest`.
4. Within 30 seconds, hit `http://localhost:8000` and confirm app renders.
5. Inspect container logs for any write attempts outside `/tmp`; fix if present.
6. Record `docker image ls feedfront` size plus `docker buildx imagetools inspect` compressed size and ensure ≤150 MB; add results to docs/metrics/bundle.md and workflow summary.
