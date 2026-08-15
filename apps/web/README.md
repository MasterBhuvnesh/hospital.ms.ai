# apps/web

Next.js 15, App Router. **One application serving all three web roles.**

## Why one app, not three

Three Next.js applications for patient, doctor and admin would duplicate auth, routing, the API client, the component library and the build pipeline, to serve one design system. Route groups already give per-role layouts, middleware and code splitting.

```
app/
  (marketing)/   landing, search, public pages
  (patient)/     dashboard, appointments, records, billing
  (doctor)/      queue, patient workspace, consultation
  (admin)/       hospital config, staff, reporting
components/      app-specific components
features/        feature slices
lib/             api client wiring, auth helpers
```

Shared components live in `packages/ui`, not here, because the desktop renderer uses them too.

## Auth

httpOnly refresh cookie plus an in-memory access token. **Never `localStorage`.** An XSS on any page becomes full account takeover, and tokens in `localStorage` survive logout on a shared reception machine.

## Stack

Tailwind v4, shadcn/ui (from `packages/ui`), TanStack Query for server state, Zustand for the little client state there is, Framer Motion for queue transitions, Recharts for analytics.
