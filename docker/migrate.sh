#!/bin/sh
# Runs pending Prisma migrations, then exits. Every service waits for this to
# finish, so none of them races the schema.
#
# Data-plane agnostic on purpose. It works against the local Compose Postgres and
# against a managed provider without knowing which it is, because it retries the
# migration itself rather than depending on a Compose healthcheck. A managed
# endpoint has no Compose service to depend on.
set -eu

SCHEMA_DIR=/app/apps/identity/prisma
ATTEMPTS=${MIGRATE_ATTEMPTS:-30}
DELAY=${MIGRATE_DELAY:-2}

if [ ! -d "$SCHEMA_DIR/migrations" ]; then
  # Expected until the first migration is generated. Exiting 0 keeps the
  # dependent services startable rather than blocking the whole stack on work
  # that has not happened yet.
  echo "migrate: no migrations directory at $SCHEMA_DIR/migrations, nothing to apply"
  exit 0
fi

cd "$SCHEMA_DIR"

i=1
while [ "$i" -le "$ATTEMPTS" ]; do
  if /app/node_modules/.bin/prisma migrate deploy; then
    echo "migrate: applied"
    exit 0
  fi
  echo "migrate: attempt $i of $ATTEMPTS failed, retrying in ${DELAY}s"
  i=$((i + 1))
  sleep "$DELAY"
done

echo "migrate: giving up after $ATTEMPTS attempts" >&2
exit 1
