# infra/helm/hms

The chart. One chart renders all eight services from a values list.

```
templates/
  deployment.yaml       loops .Values.services
  service.yaml
  hpa.yaml
  migration-job.yaml    pre-upgrade hook
  networkpolicy.yaml
values.yaml             base, cloud-neutral
values-portable.yaml    in-cluster postgres, redis, minio
values-aws.yaml         RDS, ElastiCache, S3, IRSA
```

**Adding a service is one entry in `.Values.services`** plus one `apps/<name>/Dockerfile`.

`image.mode` chooses between `per-service` (default: `registry/hms-<name>:tag`) and `all-in-one` (`registry/hms-platform:tag`). Both take the same `image.tag`, so switching modes during a recovery is a one-line values change with no rebuild.

`values.yaml` and every template are cloud-neutral: no ARN, no annotation, no storage class. `values-aws.yaml` changes values only, never a template.
