# desktop / pharmacy

**P3.** Dispensing and inventory.

Dispense against a prescription, partial dispensing, substitution with doctor confirmation, stock movement, batch and expiry tracking, low-stock alerts.

**Stock decrements on dispense, never on prescribe**, and the write is transactional so two counters cannot dispense the same last unit.
