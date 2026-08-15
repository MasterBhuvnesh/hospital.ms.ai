# packages/logger

Structured logging with PHI redaction.

A pino factory preconfigured with redaction paths, so PHI protection is configuration rather than a discipline every developer has to remember.

```ts
pino({ redact: ['req.headers.authorization', '*.email', '*.phone', '*.patientName', '*.dob'] })
```

**Never `console.log` in a service.** JSON to stdout only; the container never writes a log file.

Imported as `@hms/logger`.
