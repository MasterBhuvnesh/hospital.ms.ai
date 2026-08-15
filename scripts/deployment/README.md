# scripts/deployment

Promotion, rollback and smoke tests.

**The promotion rule: never rebuild.** `release.yml` moves the digest that already passed CI from dev to staging to production. Promoting a rebuild means testing something other than what you ship.

Rollback is a tag change, because all eight services run the same image digest.
