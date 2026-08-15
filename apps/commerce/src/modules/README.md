# apps/commerce/src/modules

The business domains this service owns.

## The rule

**Business domains, not technical layers.** A module here is `appointment/`, never `controllers/`.

Each module holds its own routes, service, repository and tests together:

```
appointment/
  appointment.routes.ts
  appointment.service.ts
  appointment.repository.ts    hospitalId scoping lives HERE
  appointment.test.ts
```

Grouping by layer scatters one feature across four folders and makes every change a four-file diff. Grouping by domain keeps a change in one place and makes a future service split a folder move.

## Expected modules

- `billing/`
- `invoice/`
- `payment/`
- `refund/`
- `pharmacy/`
- `inventory/`
- `dispensing/`
