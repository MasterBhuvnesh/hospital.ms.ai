# packages/platform

Infrastructure interfaces. **Interfaces only.**

`StorageProvider`, `SecretsProvider`, `EmailProvider`, `SmsProvider`, `PushProvider`, `WhatsAppProvider`, `PaymentProvider`, `LlmProvider`.

**No implementation, no SDK, no vendor name in this package.** It is the seam that lets the same code run on AWS and off it.

See `docs/portability.md`.

Imported as `@hms/platform`.
