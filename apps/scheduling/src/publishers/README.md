# apps/scheduling/src/publishers

Outbound RabbitMQ events.

Every publish uses the shared envelope from `@hms/events`:
`{ messageId, correlationId, causationId, occurredAt, hospitalId, actorId, version, payload }`

Naming is `<domain>.<entity>.<past-tense-verb>`. An event is a statement of fact about something that already happened, never a command.

## Events this service owns

- `appointment.created`
- `appointment.rescheduled`
- `appointment.cancelled`
- `appointment.no_show`
- `queue.token.created`
- `queue.token.updated`
- `queue.token.skipped`
- `queue.token.recalled`
- `queue.patient.near_turn`
- `consultation.started`
- `consultation.completed`

The full catalogue, with consumers and the action each takes, is in [`docs/architecture.md`](../../../../docs/architecture.md) section 6.
