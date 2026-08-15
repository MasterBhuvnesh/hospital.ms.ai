# apps/web/lib

Wiring: the typed API client from `@hms/api-client`, auth helpers, TanStack Query configuration, formatters.

**Tokens never touch `localStorage`.** The refresh token is an httpOnly cookie and the access token stays in memory. An XSS on any page would otherwise become full account takeover, and a stored token survives logout on a shared reception machine.
