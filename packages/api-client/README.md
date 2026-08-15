# packages/api-client

Typed HTTP client generated from the contracts.

Consumed by `apps/web`, `apps/mobile` and the desktop renderer, so all three call the gateway through the same typed surface and a contract change breaks them at compile time rather than at runtime.

Imported as `@hms/api-client`.
