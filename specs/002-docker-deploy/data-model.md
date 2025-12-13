# Data Model — Docker Container Deployment

## Entities

### ContainerImageArtifact
| Field | Type | Description |
|-------|------|-------------|
| `imageName` | string | `ghcr.io/<org>/<repo>` reference for the container. |
| `tag` | string | Fixed to `latest` for this feature. |
| `digest` | string | SHA256 digest captured after push for traceability. |
| `compressedSizeMB` | number | Reported size from `docker buildx imagetools inspect`; must be ≤150. |
| `commitSha` | string | Source commit used to build the image. |
| `buildTimestamp` | ISO datetime | UTC time when workflow completed the push. |
| `labels` | map<string,string> | OCI labels storing repo URL, commit, and builder version. |

### DeployWorkflow
| Field | Type | Description |
|-------|------|-------------|
| `jobName` | string | GitHub Actions job (`build-and-push`). |
| `trigger` | string | `push` to `main`. |
| `steps` | array | Ordered steps (checkout, setup-node, install deps, lint/test, build/export, docker buildx, summary). |
| `secretsUsed` | string[] | `GHCR_PUSH_TOKEN`, `GITHUB_TOKEN`. |
| `outputs` | map | `digest`, `compressedSizeMB`, `imageName`, `runUrl`. |
| `failureModes` | array | Credential failure, build failure, push failure (each logs actionable guidance). |

### RuntimeContract
| Field | Type | Description |
|-------|------|-------------|
| `port` | number | 8000 (container `EXPOSE`). |
| `user` | number | Default `65532`; must tolerate override via `docker run --user`. |
| `writablePaths` | string[] | `/tmp` only (tmpfs recommended). |
| `envVars` | map | `PORT=8000`; additional envs optional but documented. |
| `healthcheck` | string | Manual curl `http://localhost:8000` (no built-in healthcheck). |

## Relationships
- `DeployWorkflow` produces `ContainerImageArtifact` every successful run.
- `RuntimeContract` is documented inside docs/releases/docker.md and referenced by both the workflow summary and quickstart instructions.
