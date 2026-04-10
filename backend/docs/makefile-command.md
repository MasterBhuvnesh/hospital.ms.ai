# Makefile Commands — Docker Build & Push

> All commands should be run from the **backend root** directory (`/backend`).

## Prerequisites

- [Docker](https://www.docker.com/) installed and running
- `make` available (install via `sudo apt install make` on Ubuntu/WSL or `choco install make` on Windows)
- Logged in to Docker Hub: `docker login`

---

## Build All Services

Build all 21 service images at once:

```bash
make build-all
```

This will produce the following images:

| Image Name                                | Port |
| ----------------------------------------- | ---- |
| `verma2904/hms-analytics-service:latest`  | 5018 |
| `verma2904/hms-api-gateway:latest`        | 4000 |
| `verma2904/hms-appointment-service:latest` | 5005 |
| `verma2904/hms-billing-service:latest`    | 5014 |
| `verma2904/hms-calling-service:latest`    | 5019 |
| `verma2904/hms-consultation-service:latest`| 5008 |
| `verma2904/hms-doctor-service:latest`     | 5002 |
| `verma2904/hms-hospital-service:latest`   | 5003 |
| `verma2904/hms-identity-service:latest`   | 5001 |
| `verma2904/hms-inventory-service:latest`  | 5013 |
| `verma2904/hms-lab-result-service:latest` | 5011 |
| `verma2904/hms-lab-test-service:latest`   | 5010 |
| `verma2904/hms-notification-service:latest`| 5015 |
| `verma2904/hms-patient-records-service:latest` | 5007 |
| `verma2904/hms-patient-sheet-service:latest`   | 5016 |
| `verma2904/hms-pharmacy-service:latest`   | 5012 |
| `verma2904/hms-prescription-service:latest`| 5009 |
| `verma2904/hms-queue-service:latest`      | 5006 |
| `verma2904/hms-realtime-service:latest`   | 5017 |
| `verma2904/hms-search-service:latest`     | 5004 |
| `verma2904/hms-whatsapp-service:latest`   | 5020 |

---

## Build a Single Service

```bash
make build-<service-name>
```

**Example:**

```bash
make build-doctor-service
```

This builds → `verma2904/hms-doctor-service:latest`

---

## Push All Services

Push all built images to Docker Hub:

```bash
make push-all
```

---

## Push a Single Service

```bash
make push-<service-name>
```

**Example:**

```bash
make push-doctor-service
```

---

## Build & Push a Single Service Together

You can chain make targets in one command:

```bash
make build-doctor-service push-doctor-service
```

---

## Using a Custom Tag

By default all images are tagged as `latest`. To use a specific version tag:

```bash
# Build all with a version tag
make build-all TAG=v1.0.0

# Build a single service with a version tag
make build-identity-service TAG=v1.0.0

# Push with the same tag
make push-all TAG=v1.0.0
```

---

## List All Built Images

```bash
make list
```

This shows all `verma2904/hms-*` images with their tag, size, and creation time.

---

## Clean Up All Images

Remove all HMS Docker images from your local machine:

```bash
make clean
```

---

## Quick Reference

| Command                          | Description                          |
| -------------------------------- | ------------------------------------ |
| `make build-all`                 | Build all 21 service images          |
| `make build-<service>`           | Build a single service image         |
| `make push-all`                  | Push all images to Docker Hub        |
| `make push-<service>`            | Push a single service image          |
| `make list`                      | List all HMS Docker images           |
| `make clean`                     | Remove all HMS Docker images locally |
| `make help`                      | Show available commands              |

| Option       | Default      | Description                  |
| ------------ | ------------ | ---------------------------- |
| `REGISTRY`   | `verma2904`  | Docker Hub username/registry |
| `PREFIX`     | `hms-`       | Image name prefix            |
| `TAG`        | `latest`     | Image tag                    |
