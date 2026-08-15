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

**Adding a service is one entry in `.Values.services`.** All eight point at the same `image.tag` with `SERVICE: {{ .name }}`, because one image builds them all.

`values.yaml` and every template are cloud-neutral: no ARN, no annotation, no storage class. `values-aws.yaml` changes values only, never a template.
