# apps/gateway/src/routes

Route definitions and the proxy rules that map a public path to an internal service.

The gateway holds **no business logic**. A route here validates, authorizes and forwards. If a change needs a database, it belongs in a service.
