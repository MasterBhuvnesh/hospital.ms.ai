# packages/auth

JWT signing and verification, RBAC, ownership and break-glass helpers.

RS256 through `jose`. Only `identity` holds the private key; everything else verifies with the public key.

Two distinct checks, and confusing them is the vulnerability that kills healthcare products:

- **Role check:** is this caller a `DOCTOR`?
- **Ownership check:** may this doctor see *this* patient?

Break-glass helpers cover administrative clinical access: a typed reason, a bounded window, one named patient, a patient notification and a distinct audit event.

Imported as `@hms/auth`.
