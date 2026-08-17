#!/usr/bin/env bash
#
# Generates the RS256 keypair that `identity` signs tokens with and every other
# service verifies against.
#
#   bash scripts/dev/generate-jwt-keys.sh [env-file]
#
# Writes JWT_PRIVATE_KEY and JWT_PUBLIC_KEY into the env file in place.
#
# The key values never pass through stdout, a log, or a shell history entry.
# That is deliberate: a private signing key printed to a terminal is a private
# signing key in the scrollback, and this one mints every token in the system.
set -euo pipefail

ENV_FILE="${1:-envs/.env.development}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No such env file: $ENV_FILE" >&2
  echo "Create it first:  cp envs/.env.example $ENV_FILE" >&2
  exit 1
fi

command -v openssl >/dev/null || { echo "openssl is not on PATH" >&2; exit 1; }

if grep -qE '^JWT_PRIVATE_KEY=.+' "$ENV_FILE"; then
  echo "$ENV_FILE already has a JWT_PRIVATE_KEY. Refusing to overwrite it." >&2
  echo "Rotating? Clear both JWT_ keys first, and remember that every issued" >&2
  echo "token becomes invalid the moment the pair changes." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
chmod 700 "$TMP"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$TMP/private.pem" 2>/dev/null
openssl rsa -in "$TMP/private.pem" -pubout -out "$TMP/public.pem" 2>/dev/null

# Newlines are escaped so the PEM survives as a single env value.
PRIVATE="$(awk '{printf "%s\\n", $0}' "$TMP/private.pem")"
PUBLIC="$(awk '{printf "%s\\n", $0}' "$TMP/public.pem")"

# Written through a temp file rather than sed -i, which is not portable, and
# through an argument rather than an expanded pattern, so the key never becomes
# part of a command line other processes can read.
python - "$ENV_FILE" "$PRIVATE" "$PUBLIC" <<'PY'
import sys

path, private, public = sys.argv[1], sys.argv[2], sys.argv[3]

with open(path, encoding='utf-8') as handle:
    lines = handle.readlines()

replacements = {'JWT_PRIVATE_KEY': private, 'JWT_PUBLIC_KEY': public}
seen = set()

for index, line in enumerate(lines):
    for key, value in replacements.items():
        if line.startswith(f'{key}='):
            lines[index] = f'{key}={value}\n'
            seen.add(key)

missing = set(replacements) - seen
if missing:
    raise SystemExit(f'Keys absent from {path}: {", ".join(sorted(missing))}')

with open(path, 'w', encoding='utf-8', newline='\n') as handle:
    handle.writelines(lines)
PY

echo "Wrote JWT_PRIVATE_KEY (${#PRIVATE} chars) and JWT_PUBLIC_KEY (${#PUBLIC} chars) to $ENV_FILE"
echo
echo "JWT_PRIVATE_KEY belongs to the identity service and nowhere else."
echo "Every other service gets JWT_PUBLIC_KEY only."
