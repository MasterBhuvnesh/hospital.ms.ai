# apps/web/app/(patient)

Route group.

The patient portal: dashboard, appointments, live queue, medical records, consent grants, prescriptions, invoices and payment.

Mirrors the mobile application. Mobile is the primary patient surface; this exists for patients on a desktop browser.

Route groups give per-role layouts, middleware and code splitting inside one application, which is why there is one web app rather than three.
