#!/bin/sh
# Bumpt sw.js Cache Version automatisch, wenn ein gecachtes Asset im Commit geaendert wird.
ROOT=$(git rev-parse --show-toplevel)
SW="$ROOT/sw.js"
[ -f "$SW" ] || exit 0

ASSET_FILES=$(sed -n "/var ASSETS = \[/,/\];/p" "$SW" | grep -oE "'\./[^']*'" | tr -d "'" | sed 's#^\./##' | grep -v '^$')
CHANGED=$(git diff --cached --name-only)

BUMP=0
for f in $ASSET_FILES; do
  if printf '%s\n' "$CHANGED" | grep -qx "$f"; then
    BUMP=1
    break
  fi
done

if [ "$BUMP" = "1" ]; then
  NUM=$(grep -oE "dailycode-portal-v[0-9]+" "$SW" | head -1 | grep -oE '[0-9]+$')
  NEXT=$((NUM + 1))
  sed -i '' "s/dailycode-portal-v$NUM/dailycode-portal-v$NEXT/" "$SW"
  git add "$SW"
  echo "sw.js: Cache Version automatisch erhoeht v$NUM -> v$NEXT"
fi
