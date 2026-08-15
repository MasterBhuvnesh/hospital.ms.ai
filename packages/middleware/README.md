# packages/middleware

Fastify plugins every service mounts.

Authentication, the standard error response shape, request validation wiring, and correlation-id propagation.

Correlation ids enter at the gateway and must survive every hop, including RabbitMQ envelopes, so a single request can be followed across services in Loki and Tempo.

Imported as `@hms/middleware`.
