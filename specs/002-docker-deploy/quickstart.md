# Quickstart — Docker Container Deployment

## Build & Export Locally
1. `npm ci`
2. `npm run lint && npm run test`
3. `npm run build && npm run export`
4. Verify `/out` exists with the static assets.

## Build the Container
```bash
docker build -t feedfront:latest .
```
- Uses the multi-stage Dockerfile (Node 18 builder + runtime).
- Image should remain ≤150 MB compressed after buildx inspection.

## Run as Non-Root with Read-Only Root FS
```bash
docker run --rm \
  --user 1234 \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  -p 8000:8000 \
  feedfront:latest
```
- Responds on http://localhost:8000 within 30 seconds.
- Application writes only to `/tmp`; tmpfs mount provides writable space.
- Override UID/GID as required by your platform policy.

## Pull from GHCR
```bash
docker pull ghcr.io/<org>/<repo>:latest
docker run --rm --user 1234 --read-only --tmpfs /tmp:rw -p 8000:8000 ghcr.io/<org>/<repo>:latest
```

## Verification Checklist
- [ ] Container starts under 30 s and serves the timeline route.
- [ ] No logs indicate writes outside `/tmp`.
- [ ] `docker buildx imagetools inspect ghcr.io/<org>/<repo>:latest` reports ≤150 MB compressed.
- [ ] Workflow summary lists digest, size, and docs link.
