# apps/commerce/src/infrastructure

Wiring for things outside the process: the Postgres client, the Redis client, and the RabbitMQ connection.

Thin by design. Connection setup, pooling and health probes belong here; **business logic does not**. If a file in this folder knows what an appointment is, it is in the wrong folder.

Anything cloud-facing (object storage, email, SMS, payments, the model endpoint) does **not** belong here either. It goes through the interfaces in `@hms/platform`, so this service never imports a vendor SDK.
