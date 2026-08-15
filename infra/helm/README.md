# infra/helm

One chart, `hms`, rendering all eight services from a values list.

```
hms/
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

## How it works

Every service resolves its image from `image.mode`: `per-service` (the default, `registry/hms-<name>:tag`) or `all-in-one` (`registry/hms-platform:tag` with `SERVICE=<name>`). Both modes take the **same `image.tag`**, because CI builds all nine images from one commit and tags them identically.

**Adding a service is one entry in the values list** plus one `apps/<name>/Dockerfile`, not a new chart.

## The cloud-neutral rule

`values.yaml` and every template contain **no cloud-specific annotation, storage class, ARN or hostname**. Everything AWS lives in `values-aws.yaml`, which changes no template.

`scripts/ci/check-portable-chart.sh` renders the chart with `values-portable.yaml` and fails the build if an AWS string appears. That check is what keeps this true.

## Migrations

A `pre-upgrade` Job runs `prisma migrate deploy` from the same image. **Never on service startup**: eight replicas racing a migration is a bad afternoon.
