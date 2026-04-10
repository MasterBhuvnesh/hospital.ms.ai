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

# ── Valid Targets ─────────────────────────────────────
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

VALID_COMMON=(
  "logging"
  "observatory"
)

# ── Helper Functions ──────────────────────────────────

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
  echo -e "${CYAN}${BOLD}  HMS — Version Manager${NC}"
  echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
  echo ""
}

print_available_targets() {
  echo -e "${YELLOW}Available services:${NC}"
  for svc in "${VALID_SERVICES[@]}"; do
    echo -e "  ${BLUE}•${NC} $svc"
  done
  echo ""
  echo -e "${YELLOW}Available common packages:${NC}"
  for pkg in "${VALID_COMMON[@]}"; do
    echo -e "  ${BLUE}•${NC} $pkg"
  done
  echo ""
}

get_target_type() {
  local target=$1
  for svc in "${VALID_SERVICES[@]}"; do
    if [[ "$svc" == "$target" ]]; then
      echo "service"
      return 0
    fi
  done
  for pkg in "${VALID_COMMON[@]}"; do
    if [[ "$pkg" == "$target" ]]; then
      echo "common"
      return 0
    fi
  done
  return 1
}

# ── Argument Validation ──────────────────────────────

print_header

if [ -z "$1" ]; then
  echo -e "${RED}Error: Target name (service or common package) is required.${NC}"
  echo ""
  echo -e "${YELLOW}Usage:${NC} $0 ${BLUE}<name>${NC} ${BLUE}[patch|minor|major]${NC}"
  echo -e "${YELLOW}Example:${NC} $0 doctor-service minor"
  echo -e "${YELLOW}Example:${NC} $0 logging patch"
  echo ""
  print_available_targets
  exit 1
fi

TARGET_NAME=$1
VERSION_TYPE=${2:-patch}

# Validate target type
TARGET_TYPE=$(get_target_type "$TARGET_NAME")
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Invalid target name '${TARGET_NAME}'.${NC}"
  echo ""
  print_available_targets
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

if [[ "$TARGET_TYPE" == "service" ]]; then
  TARGET_DIR="$ROOT_DIR/packages/services/$TARGET_NAME"
else
  TARGET_DIR="$ROOT_DIR/packages/common/$TARGET_NAME"
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}Error: Target directory not found at $TARGET_DIR${NC}"
  exit 1
fi

if [ ! -f "$TARGET_DIR/package.json" ]; then
  echo -e "${RED}Error: package.json not found in $TARGET_DIR${NC}"
  exit 1
fi

# ── Get Current Version ──────────────────────────────

CURRENT_VERSION=$(grep -oP '"version": "\K[^"]+' "$TARGET_DIR/package.json")
echo -e "${BLUE}Target:${NC}          $TARGET_NAME ($TARGET_TYPE)"
echo -e "${BLUE}Current version:${NC} v$CURRENT_VERSION"
echo -e "${BLUE}Bump type:${NC}       $VERSION_TYPE"
echo ""

# ── Confirmation ──────────────────────────────────────

echo -e "${YELLOW}This will bump the ${BOLD}${VERSION_TYPE}${NC}${YELLOW} version for ${BOLD}${TARGET_NAME}${NC}"
if [[ "$TARGET_TYPE" == "common" ]]; then
  echo -e "${RED}${BOLD}WARNING: Updating a common package will trigger a rebuild of ALL services.${NC}"
fi
read -p "Proceed? (y/n): " -n 1 -r
echo ""

if [[ ! "$REPLY" =~ ^[yY]$ ]]; then
  echo -e "${RED}Cancelled.${NC}"
  exit 1
fi

echo ""

# ── Bump Version ─────────────────────────────────────

cd "$TARGET_DIR" || exit 1

echo -e "${YELLOW}⬆ Bumping version...${NC}"
npm version "$VERSION_TYPE" --no-git-tag-version > /dev/null 2>&1

NEW_VERSION=$(grep -oP '"version": "\K[^"]+' package.json)
echo -e "${GREEN}✓ Version bumped: v${CURRENT_VERSION} → v${NEW_VERSION}${NC}"

# ── Stage Changes ─────────────────────────────────────

cd "$ROOT_DIR" || exit 1

echo -e "${YELLOW}📦 Staging changes...${NC}"
git add "$TARGET_DIR/package.json"
if [ -f "$TARGET_DIR/package-lock.json" ]; then
  git add "$TARGET_DIR/package-lock.json"
fi

echo -e "${GREEN}✓ Changes staged${NC}"

# ── Print Final Commands ──────────────────────────────

if [[ "$TARGET_TYPE" == "service" ]]; then
  TAG_NAME="${TARGET_NAME}-v${NEW_VERSION}"
  COMMIT_MSG="chore(${TARGET_NAME}): bump version to v${NEW_VERSION}"
else
  TAG_NAME="common-${TARGET_NAME}-v${NEW_VERSION}"
  COMMIT_MSG="chore(common-${TARGET_NAME}): bump version to v${NEW_VERSION}"
fi

echo ""
echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
echo -e "${CYAN}${BOLD}  Ready to release!${NC}"
echo -e "${CYAN}${BOLD}──────────────────────────────────────────${NC}"
echo ""
echo -e "${YELLOW}Run the following commands to commit, tag, and push:${NC}"
echo ""
echo -e "${GREEN}git commit -m \"${COMMIT_MSG}\"${NC}"
echo -e "${GREEN}git tag -a \"${TAG_NAME}\" -m \"Release ${TARGET_NAME} v${NEW_VERSION}\"${NC}"
echo -e "${GREEN}git push origin HEAD --tags${NC}"
echo ""
echo -e "${BLUE}Tag:${NC}   ${TAG_NAME}"
echo ""
