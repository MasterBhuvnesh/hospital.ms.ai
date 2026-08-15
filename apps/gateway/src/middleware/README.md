# apps/gateway/src/middleware

The request pipeline, in order.

1. **Strip every inbound `x-user-*` header.** This runs first and is the single most important line in the service. Without it anyone can send `x-user-role: ADMIN` and satisfy every downstream role check.
2. Verify the JWT with the public key and set the trusted identity headers.
3. Rate limit.
4. Attach or propagate the correlation id.

Downstream services verify the JWT again themselves. Header trust is a single point of total failure, and signature verification costs microseconds.
