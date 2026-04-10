# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./

# Install production deps only
RUN npm ci --omit=dev

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine AS production

# Set non-root user for security
RUN addgroup -S smsgroup && adduser -S smsuser -G smsgroup

WORKDIR /app

# Copy installed node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY app.js ./
COPY routes/ ./routes/

# Change ownership to non-root user
RUN chown -R smsuser:smsgroup /app

USER smsuser

# Expose the SMS service port
EXPOSE 6000

# Health check — pings the server every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:6000/health || exit 1

# Start the service
CMD ["node", "app.js"]
