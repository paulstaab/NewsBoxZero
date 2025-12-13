# Docker Release Runbook

## Artifact

- Image: `ghcr.io/paulstaab/feedfront:latest`
- Digest: Recorded per workflow run in GitHub Actions summary
- Compressed Size Budget: ≤150 MB (workflow fails if exceeded)

## CI Workflow Summary

1. Checkout + Node 18 setup
2. `npm ci && npm run lint && npm run test && npm run build && npm run export`
3. `docker buildx build --platform linux/amd64 --push ghcr.io/paulstaab/feedfront:latest`
4. `docker buildx imagetools inspect` to append digest + size to summary
5. Publish docs link pointing here for operators

## Pull & Run Commands

```bash
docker pull ghcr.io/paulstaab/feedfront:latest

docker run --rm \
  --user 1234 \
  --read-only \
  --tmpfs /tmp:rw,size=64m \
  -p 8000:8000 \
  ghcr.io/paulstaab/feedfront:latest
```

- Replace `1234` with any non-root UID required by your platform.
- Use `--tmpfs /tmp:rw` or mount a host directory to `/tmp` if more space is needed.
- Container listens on port 8000 internally; map to any host port as needed.

## Writable Paths & Expectations

| Path   | Access     | Notes                                            |
| ------ | ---------- | ------------------------------------------------ |
| `/app` | read-only  | Contains exported static assets.                 |
| `/tmp` | read/write | Only writable area; provide tmpfs or host mount. |
| Others | read-only  | Root filesystem is locked to prevent drift.      |

## Startup Verification

1. Start container with flags above.
2. Within 30 seconds, curl `http://localhost:8000` (expect HTTP 200 + HTML output).
3. Check logs for any permission denials; none should appear if `/tmp` is writable.
4. Stop container (`Ctrl+C` or `docker stop`).

## Credential & Rotation Notes

- Secret: `GHCR_PUSH_TOKEN` (repo secret, packages:write scope).
- Rotation: update secret, rerun workflow, confirm summary logs success.
- Log output should reference this runbook when credential failures occur.

## Troubleshooting

| Symptom                         | Mitigation                                               |
| ------------------------------- | -------------------------------------------------------- |
| Push fails with 401             | Rotate `GHCR_PUSH_TOKEN` and re-run workflow.            |
| Container cannot bind port      | Ensure host port is free; adjust `-p` mapping.           |
| Permission errors writing cache | Confirm `--tmpfs /tmp:rw` or `-v /tmp-feedfront:/tmp`.   |
| Startup exceeds 30 s            | Inspect logs for missing build artifacts; rebuild image. |
