# packages/platform-generic

Implementations that work everywhere, including on AWS.

S3-compatible object storage (MinIO, S3, R2, Ceph), SMTP email, HTTP providers for SMS, push, WhatsApp, payments and any OpenAI-compatible model endpoint.

This is the default implementation set for every profile. Prefer the open protocol over the vendor API: SMTP over an email SDK, the S3 HTTP API over an SDK-only feature.

Imported as `@hms/platform-generic`.
