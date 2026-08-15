# scripts

Operational scripts. Each subfolder has one job.

| Folder | Contents |
|---|---|
| `dev` | Bootstrap, seed, reset the local environment |
| `db` | Migrate, seed, backup |
| `deployment` | Promote, rollback, smoke test |
| `k8s` | Cluster up and down, port-forward |
| `ci` | Gates that run in GitHub Actions |

Scripts are POSIX shell so they run identically in CI, in WSL and in Git Bash on Windows.
