# Environment Setup & Database Management

> All commands should be run from the **backend root** directory (`/backend`).

## Prerequisites

- [Docker](https://www.docker.com/) installed and running
- [pnpm](https://pnpm.io/) installed (`npm install -g pnpm`)
- Bash shell (WSL / Git Bash / macOS Terminal)

---

## Quick Start

```bash
# 1. Start infrastructure (PostgreSQL, Redis, etc.)
docker compose -f docker-compose.db.yml up -d

# 2. Push all Prisma schemas to the databases
pnpm -r --if-present run db:push

# 3. Generate all Prisma clients
pnpm -r --if-present run db:generate
```

---

## Environment Variables

HMS uses **per-service `.env` files** — each service has its own `.env` with only the variables it needs. There is no single monolithic `.env` file.

### Structure

```
backend/
├── .env                          # Infrastructure only (Postgres, Redis, MinIO, RabbitMQ creds)
├── .env.example                  # Template for root .env
└── packages/services/
    ├── identity-service/
    │   ├── .env                  # Service-specific vars (DATABASE_URL, PORT, JWT, etc.)
    │   └── .env.example          # Template
    ├── doctor-service/
    │   ├── .env
    │   └── .env.example
    └── ...
```

### Root `.env` (Infrastructure)

Used by `docker-compose.db.yml`. Contains only infrastructure credentials:

| Variable              | Default             | Used By    |
| --------------------- | ------------------- | ---------- |
| `POSTGRES_USER`       | `hms_admin`         | PostgreSQL |
| `POSTGRES_PASSWORD`   | `hms_secret`        | PostgreSQL |
| `REDIS_PASSWORD`      | `hms_redis_secret`  | Redis      |
| `MINIO_ROOT_USER`     | `hms_minio`         | MinIO      |
| `MINIO_ROOT_PASSWORD` | `hms_minio_secret`  | MinIO      |
| `RABBITMQ_USER`       | `hms_rabbit`        | RabbitMQ   |
| `RABBITMQ_PASSWORD`   | `hms_rabbit_secret` | RabbitMQ   |

### Per-Service `.env`

Each service gets a standardized `DATABASE_URL` (no service-specific prefix — no collision since each `.env` is scoped to its service).

| Variable            | Example                                                                       | Services                      |
| ------------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| `DATABASE_URL`      | `postgresql://hms_admin:hms_secret@localhost:5432/hms_identity?schema=public` | All 16 DB services            |
| `PORT`              | `5001`                                                                        | All 21 services               |
| `NODE_ENV`          | `development`                                                                 | All 21 services               |
| `JWT_SECRET`        | `your-jwt-secret-...`                                                         | identity-service, api-gateway |
| `ELASTICSEARCH_URL` | `http://localhost:9200`                                                       | search-service                |
| `REDIS_URL`         | `redis://:hms_redis_secret@localhost:6379`                                    | notification, realtime, etc.  |
| `RABBITMQ_URL`      | `amqp://hms_rabbit:hms_rabbit_secret@localhost:5672`                          | notification, whatsapp, etc.  |

> **Important:** `.env` files are gitignored (`**/.env` in `.gitignore`). Only `.env.example` files are committed.

---

## Infrastructure Services

Start all infrastructure with Docker Compose:

```bash
docker compose -f docker-compose.db.yml up -d
```

Or start individual services:

```bash
docker compose -f docker-compose.db.yml up -d postgres
docker compose -f docker-compose.db.yml up -d redis
docker compose -f docker-compose.db.yml up -d elasticsearch
docker compose -f docker-compose.db.yml up -d minio
docker compose -f docker-compose.db.yml up -d rabbitmq
```

### Infrastructure Ports

| Service         | Port          | UI/Console                            |
| --------------- | ------------- | ------------------------------------- |
| PostgreSQL 16   | `5432`        | —                                     |
| Redis 7         | `6379`        | —                                     |
| Elasticsearch 8 | `9200`        | —                                     |
| MinIO           | `9000` (API)  | `http://localhost:9001` (Console)     |
| RabbitMQ        | `5672` (AMQP) | `http://localhost:15672` (Management) |

### Data Persistence

All data is stored in named Docker volumes and persists across restarts:

| Volume                   | Data                                                        |
| ------------------------ | ----------------------------------------------------------- |
| `hms-postgres-data`      | All 16 PostgreSQL databases                                 |
| `hms-redis-data`         | Redis AOF persistence                                       |
| `hms-elasticsearch-data` | Search indices                                              |
| `hms-minio-data`         | Object storage (medical docs, lab reports, call recordings) |
| `hms-rabbitmq-data`      | Message queues                                              |

To wipe all data and start fresh:

```bash
docker compose -f docker-compose.db.yml down -v
```

---

## Database Management (Prisma)

HMS uses the **database-per-service** pattern — 16 services each have their own PostgreSQL database on a shared cluster. [Prisma ORM](https://www.prisma.io/) manages schemas and migrations.

### Run Commands Across All Services

Use `pnpm -r --if-present run` to run Prisma commands across all 16 DB services at once:

```bash
# Push schema to database (dev — no migration history)
pnpm -r --if-present run db:push

# Generate Prisma client
pnpm -r --if-present run db:generate

# Create and apply migrations
pnpm -r --if-present run db:migrate

# Open Prisma Studio (visual DB browser)
pnpm -r --if-present run db:studio
```

### Run Commands for a Single Service

```bash
# Using pnpm filter
pnpm --filter @hms/identity-service db:push
pnpm --filter @hms/identity-service db:migrate
pnpm --filter @hms/identity-service db:studio

# Or from the service directory
cd packages/services/identity-service
pnpm db:push
```

### Database-to-Service Mapping

| Service                 | Database              | Port |
| ----------------------- | --------------------- | ---- |
| identity-service        | `hms_identity`        | 5001 |
| doctor-service          | `hms_doctor`          | 5002 |
| hospital-service        | `hms_hospital`        | 5003 |
| appointment-service     | `hms_appointment`     | 5005 |
| queue-service           | `hms_queue`           | 5006 |
| patient-records-service | `hms_patient_records` | 5007 |
| consultation-service    | `hms_consultation`    | 5008 |
| prescription-service    | `hms_prescription`    | 5009 |
| lab-test-service        | `hms_lab_test`        | 5010 |
| lab-result-service      | `hms_lab_result`      | 5011 |
| pharmacy-service        | `hms_pharmacy`        | 5012 |
| inventory-service       | `hms_inventory`       | 5013 |
| billing-service         | `hms_billing`         | 5014 |
| patient-sheet-service   | `hms_patient_sheet`   | 5016 |
| analytics-service       | `hms_analytics`       | 5018 |
| calling-service         | `hms_calling`         | 5019 |

### Non-DB Services

These 5 services do not have a PostgreSQL database:

| Service              | Port | Uses                              |
| -------------------- | ---- | --------------------------------- |
| api-gateway          | 4000 | Routes requests to other services |
| search-service       | 5004 | Elasticsearch                     |
| notification-service | 5015 | Redis + RabbitMQ                  |
| realtime-service     | 5017 | Redis (WebSocket state)           |
| whatsapp-service     | 5020 | RabbitMQ                          |
