# desktop / reception

**P1.** Intake, queue control and the counters.

Walk-in registration, appointment check-in, patient lookup, token generation and thermal printing, call next, skip, recall, merge and reassign, the doctor availability board, the billing counter and the dispensing counter.

This module must keep working through a network outage: reads come from cache, and registration and check-in are queued locally and replayed with idempotency keys.
