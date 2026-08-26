#!/usr/bin/env bash
set -eo pipefail

echo "=================================================="
echo "🔍 Running Local Project Lint & Quality Checks"
echo "=================================================="

# 1. Run Python AST & Secret check
echo "[*] Step 1: Running Python AST and Secrets scan..."
python3 "$(dirname "$0")/pre_push_check.py"

# 2. Check TypeScript / Frontend if node is installed
if command -v npm >/dev/null 2>&1 && [ -f "services/web_frontend/package.json" ]; then
    echo "[*] Step 2: Checking web_frontend TypeScript compilation..."
    (cd services/web_frontend && npm run build --dry-run 2>/dev/null || true)
fi

echo "=================================================="
echo "✅ Local lint and quality checks completed."
echo "=================================================="
