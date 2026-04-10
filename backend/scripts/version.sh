#!/bin/bash

# ──────────────────────────────────────────────────────
# HMS — Service Version Manager
# ──────────────────────────────────────────────────────
# Automates version bumping, Git tagging, and prepares
# changes for remote pushing for HMS microservices.
#
# Usage: ./scripts/version.sh <service-name> [patch|minor|major]
# Example: ./scripts/version.sh doctor-service minor
# Default bump type: patch
#
# Author: Bhuvnesh Verma
# ──────────────────────────────────────────────────────

# ── Colors ────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Valid Services ────────────────────────────────────
VALID_SERVICES=(
  "analytics-service"
  "api-gateway"
  "appointment-service"
  "billing-service"
  "calling-service"
  "consultation-service"
  "doctor-service"
  "hospital-service"
  "identity-service"
  "inventory-service"
  "lab-result-service"
  "lab-test-service"
  "notification-service"
  "patient-records-service"
  "patient-sheet-service"
  "pharmacy-service"
  "prescription-service"
  "queue-service"
  "realtime-service"
  "search-service"
  "whatsapp-service"
)

# ── Helper Functions ──────────────────────────────────

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
  echo -e "${CYAN}${BOLD}  HMS — Version Manager${NC}"
  echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
  echo ""
}

print_services() {
  echo -e "${YELLOW}Available services:${NC}"
  echo ""
  for svc in "${VALID_SERVICES[@]}"; do
    echo -e "  ${BLUE}•${NC} $svc"
  done
  echo ""
}

is_valid_service() {
  local service=$1
  for svc in "${VALID_SERVICES[@]}"; do
    if [[ "$svc" == "$service" ]]; then
      return 0
    fi
  done
  return 1
}

# ── Argument Validation ──────────────────────────────

print_header

if [ -z "$1" ]; then
  echo -e "${RED}Error: Service name is required.${NC}"
  echo ""
  echo -e "${YELLOW}Usage:${NC} $0 ${BLUE}<service-name>${NC} ${BLUE}[patch|minor|major]${NC}"
  echo -e "${YELLOW}Example:${NC} $0 doctor-service minor"
  echo ""
  print_services
  exit 1
fi

SERVICE_NAME=$1
VERSION_TYPE=${2:-patch}

# Validate service name
if ! is_valid_service "$SERVICE_NAME"; then
  echo -e "${RED}Error: Invalid service name '${SERVICE_NAME}'.${NC}"
  echo ""
  print_services
  exit 1
fi

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid version type '${VERSION_TYPE}'.${NC}"
  echo -e "${YELLOW}Please use: ${BLUE}patch${NC}, ${BLUE}minor${NC}, or ${BLUE}major${NC}"
  exit 1
fi

# ── Resolve Paths ─────────────────────────────────────

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
SERVICE_DIR="$ROOT_DIR/packages/services/$SERVICE_NAME"

if [ ! -d "$SERVICE_DIR" ]; then
  echo -e "${RED}Error: Service directory not found at $SERVICE_DIR${NC}"
  exit 1
fi

if [ ! -f "$SERVICE_DIR/package.json" ]; then
  echo -e "${RED}Error: package.json not found in $SERVICE_DIR${NC}"
  exit 1
fi

# ── Get Current Version ──────────────────────────────

CURRENT_VERSION=$(grep -oP '"version": "\K[^"]+' "$SERVICE_DIR/package.json")
echo -e "${BLUE}Service:${NC}         $SERVICE_NAME"
echo -e "${BLUE}Current version:${NC} v$CURRENT_VERSION"
echo -e "${BLUE}Bump type:${NC}       $VERSION_TYPE"
echo ""

# ── Confirmation ──────────────────────────────────────

echo -e "${YELLOW}This will bump the ${BOLD}${VERSION_TYPE}${NC}${YELLOW} version for ${BOLD}${SERVICE_NAME}${NC}"
read -p "Proceed? (y/n): " -n 1 -r
echo ""

if [[ ! "$REPLY" =~ ^[yY]$ ]]; then
  echo -e "${RED}Cancelled.${NC}"
  exit 1
fi

echo ""

# ── Bump Version ─────────────────────────────────────

cd "$SERVICE_DIR" || exit 1

echo -e "${YELLOW}⬆ Bumping version...${NC}"
npm version "$VERSION_TYPE" --no-git-tag-version > /dev/null 2>&1

NEW_VERSION=$(grep -oP '"version": "\K[^"]+' package.json)
echo -e "${GREEN}✓ Version bumped: v${CURRENT_VERSION} → v${NEW_VERSION}${NC}"

# ── Update service-info.json if it exists ─────────────

if [ -f "src/info/requests.ts" ]; then
  echo -e "${YELLOW}⬆ Version in requests.ts is loaded from package.json at runtime — no update needed.${NC}"
fi

# ── Stage Changes ─────────────────────────────────────

cd "$ROOT_DIR" || exit 1

echo -e "${YELLOW}📦 Staging changes...${NC}"
git add "$SERVICE_DIR/package.json"
if [ -f "$SERVICE_DIR/package-lock.json" ]; then
  git add "$SERVICE_DIR/package-lock.json"
fi

echo -e "${GREEN}✓ Changes staged${NC}"

# ── Print Final Commands ──────────────────────────────

TAG_NAME="${SERVICE_NAME}-v${NEW_VERSION}"

echo ""
echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
echo -e "${CYAN}${BOLD}  Ready to release!${NC}"
echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
echo ""
echo -e "${YELLOW}Run the following to commit, tag, and push:${NC}"
echo ""
echo -e "${GREEN}git commit -m \"chore(${SERVICE_NAME}): bump version to v${NEW_VERSION}\" && \\
git tag -a \"${TAG_NAME}\" -m \"Release ${SERVICE_NAME} v${NEW_VERSION}\" && \\
git push origin HEAD --tags${NC}"
echo ""
echo -e "${BLUE}Tag:${NC}   ${TAG_NAME}"
echo ""
