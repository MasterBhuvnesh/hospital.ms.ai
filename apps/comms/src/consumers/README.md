# apps/comms/src/consumers

Inbound RabbitMQ handlers, one file per event.

## The rule that is not optional

**Every consumer is idempotent on `messageId`.** Delivery is at-least-once, so redelivery is normal operation rather than an error. A consumer that sends a second WhatsApp message or decrements stock twice on redelivery is a defect.

Each consumer has a dead-letter queue. Failures go there for inspection; they are never silently dropped.

## Events this service consumes

- `every event that a human should hear about. See docs/architecture.md section 6`
