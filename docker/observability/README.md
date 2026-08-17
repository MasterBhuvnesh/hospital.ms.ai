# docker/observability

Configuration for the local Prometheus, Grafana, Loki and Tempo stack started by `pnpm obs:up`.

| File | Consumed by |
|---|---|
| `prometheus.yml` | Prometheus scrape targets |
| `tempo.yaml` | Tempo receivers, storage, and the metrics generator |
| `grafana-datasources.yml` | Grafana provisioning, so it starts already wired |

## Running it

```bash
pnpm deps:up      # first. The observability stack joins the deps network
pnpm obs:up
```

| Service | URL | Notes |
|---|---|---|
| Grafana | <http://localhost:3001> | Anonymous admin. Port 3001 because 3000 is the Next.js dev server |
| Prometheus | <http://localhost:9090> | |
| Tempo | <http://localhost:3200> | OTLP on 4317 (gRPC) and 4318 (HTTP) |
| Loki | <http://localhost:3100> | |

Point the services at it:

```bash
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
LOKI_URL=http://localhost:3100
```

## What each one answers

| Signal | Store | The question it answers |
|---|---|---|
| Metrics | Prometheus | Is it slow, and how often |
| Traces | Tempo | **Where** the time went, across service boundaries |
| Logs | Loki | What actually happened in that one request |

The value is in the links between them, which is why the datasources are provisioned rather than left to be added by hand. An exemplar on a latency histogram opens the trace; a span opens its logs; the service graph is built from the spans. Three separate tools with no links between them is three tools nobody opens at 2am.

## Why it is a separate Compose file

The datastores in `deps.yml` are needed to run anything. These four are not, and four extra containers on every `pnpm dev` is a tax paid by people debugging a route handler. Start them when you are looking at latency.

## Logs in development

Services started with `pnpm dev` run on the host and log to your terminal, which is usually what you want. Loki sees them only when the services are containerised (`dev.yml`, `single-host.yml`) or when `LOKI_URL` is set and the pino transport ships to it.

This is also why `prometheus.yml` scrapes `host.docker.internal`: in development the metrics endpoints are on the host, not on the Compose network. Kubernetes does not use this file at all, it uses `ServiceMonitor` discovery.

## Same stack on every profile

Self-hosted here, self-hosted in Kubernetes, self-hosted on AWS. There is no CloudWatch path, deliberately: a dashboard and an alert rule that work on a hospital's own hardware are the same dashboard and alert rule that work on our hosted cluster. See [`docs/portability.md`](../../docs/portability.md).

## Not here yet

Dashboards and alert rules. They arrive in P6 with the load tests, because a dashboard drawn before there is traffic shows the panels somebody imagined rather than the ones that turned out to matter.
