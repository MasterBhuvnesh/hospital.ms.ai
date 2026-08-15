# scripts/db

Migrations, seeding and backups.

**Migrations never run on service startup.** Eight replicas racing a migration is a bad afternoon. In Kubernetes they run as a Helm `pre-upgrade` Job from the same image; in Compose they run as a `migrate` service that every other service depends on.

Backups use pgBackRest or WAL-G against an S3-compatible target, so the same configuration works against MinIO and against S3.
