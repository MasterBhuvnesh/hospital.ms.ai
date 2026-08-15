# apps/web/app/(doctor)

Route group.

The doctor's web surface: queue, patient workspace, consultation history, prescriptions and lab results.

The desktop application is the doctor's primary surface, because it has the printer and device access. This is the read-heavy companion.

Route groups give per-role layouts, middleware and code splitting inside one application, which is why there is one web app rather than three.
