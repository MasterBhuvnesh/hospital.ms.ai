# packages/events

RabbitMQ publish, consume, envelope and delayed publish.

The envelope is `{ messageId, correlationId, causationId, occurredAt, hospitalId, actorId, version, payload }`.

Delivery is at-least-once everywhere, so **every consumer is idempotent on `messageId`**. Redelivery is normal operation, not an error.

Delayed work uses the `rabbitmq_delayed_message_exchange` plugin via `x-delay`. There is no second job system: no BullMQ, no node-cron.

The full event catalogue lives in `docs/architecture.md` section 6.

Imported as `@hms/events`.
