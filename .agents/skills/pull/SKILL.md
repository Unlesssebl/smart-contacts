---
name: pull
description: >-
  Triggered via `/pull` or `/git-pull`. Safely pulls remote changes from upstream,
  validates project syntax & secrets, rebuilds and restarts production Docker containers,
  and verifies healthchecks and endpoint availability.
---

# /pull Workflow: Safe Git Pull, Production Deploy & Verification

This workflow is invoked directly via **`/pull`** or **`/git-pull`**.

---

## ⚡ Execution Steps

### 1. Fetch and Rebase/Pull Remote Changes
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch origin "$BRANCH"
git pull --rebase origin "$BRANCH"
```

### 2. Verify Merge / Rebase Status
- If conflicts occur: inspect conflicting files with `git status`, resolve conflict markers, and continue rebase (`git rebase --continue`).
- If clean: proceed to code validation.

### 3. Validate Local Project Integrity
Run the AST syntax & secrets check to ensure pulled code has no syntax errors:
```bash
python3 .agents/skills/git-push-workflow/scripts/pre_push_check.py
```

### 4. Production Docker Rebuild & Deploy
Apply changes in production mode (explicitly using `docker-compose.yml` to ignore development overrides like `docker-compose.override.yml`):
```bash
docker compose -f docker-compose.yml up -d --build --remove-orphans
```

### 5. Healthcheck & Endpoint Verification
Verify container states and test both direct backend and reverse-proxy SSL endpoints:
```bash
# 1. Check container health status
docker compose -f docker-compose.yml ps

# 2. Test direct API Gateway health endpoint
curl -f -s http://127.0.0.1:8001/health || exit 1

# 3. Test reverse-proxy HTTPS / HTTP/2 API Gateway endpoint
curl -k -f -s https://127.0.0.1/api/v1/health || exit 1
```

If any service fails or healthchecks degrade, inspect logs:
```bash
docker compose -f docker-compose.yml logs --tail=50
```

### 6. Summary Report
Report pulled commits, modified files, running container health statuses, and endpoint test results.
