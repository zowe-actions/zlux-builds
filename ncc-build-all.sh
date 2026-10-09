#!/usr/bin/env bash

# Compiles every JS action into its dist/ bundle.
#
# Uses the ncc pinned in devDependencies rather than a global install, so the
# committed bundles don't change depending on whose machine built them.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
NCC="$ROOT/node_modules/.bin/ncc"

if [ ! -x "$NCC" ]; then
  echo "ERROR: $NCC not found. Run 'npm ci' first." >&2
  exit 1
fi

echo "Using ncc $("$NCC" version)"

cd "$ROOT"

# A JS action is a directory holding both an action manifest and an index.js;
# this skips composite actions and the npm-registry library.
while IFS= read -r manifest; do
  dir="$(dirname "$manifest")"
  [ -f "$dir/index.js" ] || continue
  echo "==> building ${dir#./}"
  ( cd "$dir" && "$NCC" build index.js --license licenses.txt )
done < <(find . -type f \( -name 'action.yml' -o -name 'action.yaml' \) \
           -not -path './node_modules/*' | sort)



