#!/usr/bin/env bash
set -euo pipefail

# Safe git push script with automated upstream tracking detection
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT_SHA=$(git rev-parse --short HEAD)
REMOTE="origin"

echo "=================================================="
echo "🚀 AGY Git Push: Branch [${BRANCH}] @ ${COMMIT_SHA}"
echo "=================================================="

# Check if upstream tracking branch is configured
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)

if [ -z "${UPSTREAM}" ]; then
    echo "[*] Upstream tracking branch not configured. Pushing and setting upstream to ${REMOTE}/${BRANCH}..."
    git push --set-upstream "${REMOTE}" "${BRANCH}"
else
    echo "[*] Pushing commits to ${REMOTE}/${BRANCH}..."
    git push "${REMOTE}" "${BRANCH}"
fi

echo "=================================================="
echo "✅ Git push completed successfully."
echo "=================================================="
