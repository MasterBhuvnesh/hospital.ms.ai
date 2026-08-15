# apps/web/app/(admin)

Route group.

The administration console: hospital and department configuration, rooms, services, fees, timezone, staff and roles, patient administration, reporting, and the break-glass request flow.

**Admin is not a clinical role.** Clinical content requires break-glass, with a typed reason, a bounded window, patient notification and a distinct audit event.

Route groups give per-role layouts, middleware and code splitting inside one application, which is why there is one web app rather than three.
