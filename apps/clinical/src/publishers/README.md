# apps/clinical/src/publishers

Outbound RabbitMQ events.

Every publish uses the shared envelope from `@hms/events`:
`{ messageId, correlationId, causationId, occurredAt, hospitalId, actorId, version, payload }`

Naming is `<domain>.<entity>.<past-tense-verb>`. An event is a statement of fact about something that already happened, never a command.

## Events this service owns

- `patient_sheet.ready`
- `consultation.content.saved`
- `prescription.signed`
- `consent.granted`
- `consent.revoked`
- `lab.order.created`
- `lab.sample.collected`
- `lab.result.released`
- `phi.accessed`

The full catalogue, with consumers and the action each takes, is in [`docs/architecture.md`](../../../../docs/architecture.md) section 6.
