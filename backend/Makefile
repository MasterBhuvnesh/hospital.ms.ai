# ──────────────────────────────────────────────────────
# HMS — Docker Build Makefile
# ──────────────────────────────────────────────────────
# Usage:
#   make build-all         Build all service images
#   make build-<service>   Build a single service
#   make push-all          Push all images to registry
#   make clean             Remove all hms images
# ──────────────────────────────────────────────────────

REGISTRY := verma2904
PREFIX := hms-
TAG := latest

# All pnpm workspace services
SERVICES := analytics-service api-gateway appointment-service billing-service calling-service consultation-service doctor-service hospital-service identity-service inventory-service lab-result-service lab-test-service notification-service patient-records-service patient-sheet-service pharmacy-service prescription-service queue-service realtime-service search-service whatsapp-service

BUILD_TARGETS := $(addprefix build-,$(SERVICES))
PUSH_TARGETS := $(addprefix push-,$(SERVICES))

# ── Build targets ─────────────────────────────────────

.PHONY: build-all $(BUILD_TARGETS)

build-all: $(BUILD_TARGETS)
	@echo ""
	@echo "All services built successfully!"

$(BUILD_TARGETS): build-%:
	@echo ""
	@echo "Building $*..."
	@echo "----------------------------------------------"
	docker build -f packages/services/$*/Dockerfile -t $(REGISTRY)/$(PREFIX)$*:$(TAG) .
	@echo "Done: $(REGISTRY)/$(PREFIX)$*:$(TAG)"
	@echo ""

# ── Push targets ──────────────────────────────────────

.PHONY: push-all $(PUSH_TARGETS)

push-all: $(PUSH_TARGETS)
	@echo ""
	@echo "All services pushed!"

$(PUSH_TARGETS): push-%:
	docker push $(REGISTRY)/$(PREFIX)$*:$(TAG)

# ── List images ───────────────────────────────────────

.PHONY: list
list:
	@docker images --filter "reference=$(REGISTRY)/$(PREFIX)*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"

# ── Clean ─────────────────────────────────────────────

.PHONY: clean
clean:
	@echo "Removing all $(REGISTRY)/$(PREFIX)* images..."
	-docker images --filter "reference=$(REGISTRY)/$(PREFIX)*" -q | sort -u | xargs docker rmi -f
	@echo "Clean complete"

# ── Help ──────────────────────────────────────────────

.PHONY: help
help:
	@echo ""
	@echo "HMS Docker Makefile"
	@echo "----------------------------------------------"
	@echo "  make build-all              Build all 21 service images"
	@echo "  make build-<service>        Build a single service"
	@echo "  make push-all               Push all images to registry"
	@echo "  make push-<service>         Push a single service image"
	@echo "  make list                   List all HMS images"
	@echo "  make clean                  Remove all HMS images"
	@echo ""
	@echo "  REGISTRY   Docker Hub user   (default: verma2904)"
	@echo "  PREFIX     Image prefix      (default: hms-)"
	@echo "  TAG        Image tag         (default: latest)"
	@echo ""
