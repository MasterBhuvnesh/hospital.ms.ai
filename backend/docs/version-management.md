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

### Direct Script

```bash
./scripts/version.sh <name> [patch|minor|major]
```

### via pnpm (Recommended)

You can run the release scripts from any directory using `pnpm --filter`:

```bash
# Services
pnpm --filter @hms/doctor-service release        # patch
pnpm --filter @hms/doctor-service release:minor  # minor
pnpm --filter @hms/doctor-service release:major  # major

# Common Packages
pnpm --filter @hms/common-logging release
```

---

## Options

- **name** — required, one of the HMS services or common packages
- **bump type** — optional, defaults to `patch`

| Bump Type | When to Use                          | Example            |
| --------- | ------------------------------------ | ------------------ |
| `patch`   | Bug fixes, small changes             | `1.0.0` → `1.0.1` |
| `minor`   | New features, backward compatible    | `1.0.0` → `1.1.0` |
| `major`   | Breaking changes                     | `1.0.0` → `2.0.0` |

---

## Examples

### Service bump

```bash
./scripts/version.sh doctor-service patch
```

### Common package bump

```bash
./scripts/version.sh logging minor
```

> [!IMPORTANT]
> Bumping a **common package** (like `logging`) will trigger a GitHub Action that rebuilds **ALL** 21 services to ensure they use the updated code.

---

## What the Script Does

1. Validates the target name and bump type
2. Shows current version and asks for confirmation
3. Bumps the version in the target's `package.json`
4. Stages the changed `package.json` in Git
5. Prints the exact commands to commit and tag the version bump

---

## Full Workflow Example

```bash
# 1. Bump the version
./scripts/version.sh doctor-service minor

# 2. The script will print commands like:
git commit -m "chore(doctor-service): bump version to v1.1.0"
git tag -a "doctor-service-v1.1.0" -m "Release doctor-service v1.1.0"
git push origin HEAD --tags
```

---

## Git Tag Format

- **Services**: `<service-name>-v<version>` (e.g., `doctor-service-v1.1.0`)
- **Common Packages**: `common-<package-name>-v<version>` (e.g., `common-logging-v1.1.0`)

---

## Available Targets

### Services

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

### Common Packages

| Package      | Directory                    |
| ------------ | ---------------------------- |
| `logging`    | `packages/common/logging`    |
| `observatory`| `packages/common/observatory`|
