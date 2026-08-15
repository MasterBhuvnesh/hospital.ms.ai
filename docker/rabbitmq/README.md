# docker/rabbitmq

RabbitMQ with `rabbitmq_delayed_message_exchange` enabled.

## Why a custom image

All scheduled work (appointment reminders, refill reminders, lab SLA checks, no-show marking) publishes with `x-delay` through the delayed-message exchange. The stock image and the stock Helm chart do not include that plugin.

**This image is used on every profile, including AWS.** Amazon MQ for RabbitMQ runs a managed broker with a fixed plugin set and cannot install it, so rather than run two different mechanisms on two profiles, RabbitMQ is self-hosted everywhere. One deployment shape, one set of failure modes, one runbook.

Where the plugin is genuinely unavailable, the fallback is **one queue per TTL bucket** with a dead-letter exchange, never a shared queue with per-message TTL: TTL queues expire in head-of-line order, so a 24-hour message queued ahead of a 2-hour message would block it.
