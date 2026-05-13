# HMS Microservices

Hospital Management System backend — a pnpm monorepo with Express + TypeScript microservices.

## Services

| Service | Port | Description |
|---------|------|-------------|
| appointment-service | 3001 | Appointment CRUD, auto-generates PDF bill on completion |
| auth-service | 3002 | User registration, login, JWT tokens |
| doctor-service | 3003 | Doctor profiles CRUD |
| message-service | 3004 | In-app messaging between users |
| patient-service | 3005 | Patient profiles, vitals, walk-in support |
| prescription-service | 3006 | Prescriptions, auto-generates PDF on creation |
| file-uploader-service | 3007 | Cloudinary file upload/delete |
| pdf-generation-service | 3008 | PDF generation (bills, prescriptions) + Cloudinary upload |
| medical-records-service | 3009 | Patient medical record PDF uploads |

## Shared Packages

| Package | Description |
|---------|-------------|
| `@hms/common-db` | Prisma client + schema (PostgreSQL / Neon) |
| `@hms/common-logging` | Winston logger factory |

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8 (`npm install -g pnpm`)

## Setup

### 1. Clone and install

```bash
cd services
pnpm install
```

### 2. Generate Prisma client

```bash
cd packages/common-db
npx prisma generate
```

> If you need to push schema changes to the database:
> ```bash
> npx prisma db push
> ```

### 3. Run all services

From the root `services/` folder:

```bash
pnpm dev
```

This starts **all 9 services** in parallel using `ts-node-dev` with hot-reload.

To run a single service:

```bash
pnpm --filter @hms/appointment-service dev
```

## Build

```bash
pnpm build
```

Compiles all services to `dist/` folders.

## API Collection

Import `docs/hms-api.postman_collection.json` into Postman to test all endpoints. Set the `baseUrl` variable to `http://localhost`.

## Project Structure

```
services/
├── apps/
│   ├── appointment-service/
│   ├── auth-service/
│   ├── doctor-service/
│   ├── file-uploader-service/
│   ├── medical-records-service/
│   ├── message-service/
│   ├── patient-service/
│   ├── pdf-generation-service/
│   └── prescription-service/
├── packages/
│   ├── common-db/          # Prisma schema + client
│   └── common-logging/     # Winston logger
├── docs/
│   └── hms-api.postman_collection.json
├── package.json            # Root workspace scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Notes

- All services share a single PostgreSQL database (Neon serverless).
- `file-uploader-service` must be running for PDF generation and medical record uploads to work.
- `pdf-generation-service` must be running for auto-PDF features (appointment completion, prescription creation).
- Each service uses `dotenv/config` and reads from the root `.env` file when started from the root directory.
