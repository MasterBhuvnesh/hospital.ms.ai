# scripts/ci

Gates that run in GitHub Actions and fail the pull request.

| Script | Checks |
|---|---|
| `check-portable-chart.sh` | The base Helm chart rendered with `values-portable.yaml` contains no `amazonaws.com`, `alb.ingress`, `service.beta.kubernetes.io/aws-`, or `gp2`/`gp3` storage class |
| `check-traceability.sh` | Every checklist id prefix in `docs/role-checklist.md` exists in `docs/traceability.md`, and every matrix row has items |

These exist because documentation and portability both decay silently. A rule that is not enforced by a failing build is a preference, not a rule.
