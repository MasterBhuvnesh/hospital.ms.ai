# tests/performance

k6.

**Target: 500 concurrent queue watchers per hospital**, with p95 queue-update latency under two seconds.

Also load-tested here, because it is a correctness property rather than a throughput one: **concurrent walk-in registration must never issue the same token twice.** That race is the difference between a working waiting room and an embarrassing one, and it only appears under real concurrency.
