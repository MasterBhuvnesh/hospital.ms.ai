# infra/helm/hms/templates

| Template | Renders |
|---|---|
| `deployment.yaml` | One Deployment per entry in `.Values.services`, all on the same image digest |
| `service.yaml` | `ClusterIP` for every service. Only `gateway` is reachable through Ingress |
| `hpa.yaml` | CPU autoscaling, plus a KEDA trigger on RabbitMQ queue depth for `scheduling` |
| `migration-job.yaml` | `pre-upgrade` hook running `prisma migrate deploy` from the same image |
| `networkpolicy.yaml` | Default-deny, then explicit allows |

## Two rules

**Migrations are a hook, never a startup step.** Eight replicas racing a migration is a bad afternoon.

**No cloud-specific value belongs in a template.** If AWS needs something different, it is a value in `values-aws.yaml`. `scripts/ci/check-portable-chart.sh` fails the build if an AWS string reaches the rendered output.
