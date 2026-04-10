# Version Management — HMS Microservices

> Run all commands from the **backend root** (`/backend`).

## Prerequisites

- Bash shell (WSL / Git Bash / macOS Terminal)
- `npm` installed (used for `npm version` under the hood)

## Setup

Make the script executable (one-time):

```bash
chmod +x scripts/version.sh
```

---

## Usage

```bash
./scripts/version.sh <service-name> [patch|minor|major]
```

- **service-name** — required, one of the 21 HMS services
- **bump type** — optional, defaults to `patch`

| Bump Type | When to Use                          | Example            |
| --------- | ------------------------------------ | ------------------ |
| `patch`   | Bug fixes, small changes             | `1.0.0` → `1.0.1` |
| `minor`   | New features, backward compatible    | `1.0.0` → `1.1.0` |
| `major`   | Breaking changes                     | `1.0.0` → `2.0.0` |

---

## Examples

### Patch bump (default)

```bash
./scripts/version.sh doctor-service
```

### Minor bump

```bash
./scripts/version.sh identity-service minor
```

### Major bump

```bash
./scripts/version.sh api-gateway major
```

---

## What the Script Does

1. Validates the service name and bump type
2. Shows current version and asks for confirmation
3. Bumps the version in `packages/services/<service>/package.json`
4. Stages the changed `package.json` in Git
5. Prints the exact commands to:
   - **Commit & tag** the version bump
   - **Build & push** the Docker image with the new version tag

---

## Full Workflow Example

```bash
# 1. Bump the version
./scripts/version.sh doctor-service minor

# 2. The script will print commands like:
git commit -m "chore(doctor-service): bump version to v1.1.0" && \
git tag -a "doctor-service-v1.1.0" -m "Release doctor-service v1.1.0" && \
git push origin HEAD --tags
```

---

## Git Tag Format

Tags follow the pattern: `<service-name>-v<version>`

Examples:

```
doctor-service-v1.1.0
identity-service-v2.0.0
api-gateway-v1.0.3
```

---

## Available Services

| Service                  | Directory                                    |
| ------------------------ | -------------------------------------------- |
| `analytics-service`      | `packages/services/analytics-service`        |
| `api-gateway`            | `packages/services/api-gateway`              |
| `appointment-service`    | `packages/services/appointment-service`      |
| `billing-service`        | `packages/services/billing-service`          |
| `calling-service`        | `packages/services/calling-service`          |
| `consultation-service`   | `packages/services/consultation-service`     |
| `doctor-service`         | `packages/services/doctor-service`           |
| `hospital-service`       | `packages/services/hospital-service`         |
| `identity-service`       | `packages/services/identity-service`         |
| `inventory-service`      | `packages/services/inventory-service`        |
| `lab-result-service`     | `packages/services/lab-result-service`       |
| `lab-test-service`       | `packages/services/lab-test-service`         |
| `notification-service`   | `packages/services/notification-service`     |
| `patient-records-service`| `packages/services/patient-records-service`  |
| `patient-sheet-service`  | `packages/services/patient-sheet-service`    |
| `pharmacy-service`       | `packages/services/pharmacy-service`         |
| `prescription-service`   | `packages/services/prescription-service`     |
| `queue-service`          | `packages/services/queue-service`            |
| `realtime-service`       | `packages/services/realtime-service`         |
| `search-service`         | `packages/services/search-service`           |
| `whatsapp-service`       | `packages/services/whatsapp-service`         |
