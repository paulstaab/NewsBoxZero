# Contract — Docker Container Build & Publish

## Workflow Inputs
| Name | Type | Source | Description |
|------|------|--------|-------------|
| `ref` | string | GitHub Actions `push` event | Must be `refs/heads/main`; workflow exits early otherwise. |
| `GHCR_PUSH_TOKEN` | secret | Repo secret | PAT with `packages:write`. Used by `docker/login-action`. |
| `NODE_VERSION` | env | workflow | Pinned to `18.x` for deterministic builds. |

## Workflow Steps (Happy Path)
1. **Checkout** — uses `actions/checkout@v4`.
2. **Setup Node** — `actions/setup-node@v4` with caching enabled.
3. **Install & Test** — `npm ci`, `npm run lint`, `npm run test`, `npm run build`, `npm run export`.
4. **Login to GHCR** — `docker/login-action@v3` with PAT.
5. **Build & Push** — `docker buildx build --platform linux/amd64 -t ghcr.io/<org>/<repo>:latest --push .`.
6. **Summarize** — `docker buildx imagetools inspect` to capture digest + compressed size; append to `$GITHUB_STEP_SUMMARY`.

## Success Response (Workflow Summary)
```jsonc
{
  "image": "ghcr.io/<org>/<repo>:latest",
  "digest": "sha256:...",
  "compressedSizeMB": 128.4,
  "commit": "abc1234",
  "publishedAt": "2025-12-13T16:42:00Z"
}
```
- MUST include warning if `compressedSizeMB > 150` and mark job failed.
- MUST include link to docs/releases/docker.md for run instructions.

## Failure Modes & Requirements
| Failure | Detection | Contractual Response |
|---------|-----------|----------------------|
| Credential error | `docker/login-action` exit ≠ 0 | Job fails with message: "GHCR authentication failed; rotate GHCR_PUSH_TOKEN" plus docs link. |
| Build failure | `npm` or `docker buildx` exit ≠ 0 | Job stops, surfaces logs; no partial push. |
| Size budget exceeded | `compressedSizeMB > 150` | Mark job failed, include measured size and link to trimming guidance. |

## Runtime Contract (Container Consumers)
| Requirement | Value |
|-------------|-------|
| Image | `ghcr.io/<org>/<repo>:latest` |
| Port | 8000 (HTTP) |
| User | Default `65532`; override allowed via `--user` flag |
| Writable path | `/tmp` only; mount tmpfs via `--tmpfs /tmp:rw` |
| Read-only root FS | Supported via `--read-only` |
| Startup SLA | Responds within 30 s of container start |

Operators must follow the commands documented in docs/releases/docker.md, which forms part of this contract.
