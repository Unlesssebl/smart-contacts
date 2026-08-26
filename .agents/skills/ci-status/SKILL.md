---
name: ci-status
description: >-
  Triggered via `/ci-status` or `/check-logs`. Fetches and displays the status of remote CI/CD pipelines (GitHub Actions),
  inspects local Docker container logs, and diagnoses errors for the current commit/branch without pushing.
---

# /ci-status Workflow: Check CI/CD Pipeline Status & Logs

This workflow is invoked directly via **`/ci-status`** or **`/check-logs`** to inspect CI runs, download failure logs, and diagnose errors without initiating a git push.

---

## ⚡ Execution Steps

### 1. Fetch Pipeline Status & Logs
Run the pipeline monitor for the current branch/commit:
```bash
python3 .agents/skills/git-push-workflow/scripts/monitor_pipeline.py --timeout=15
```

### 2. Inspect Docker & Local Container Logs (if applicable)
Check status and recent logs of local services:
```bash
docker compose ps
docker compose logs --tail=50
```

### 3. Generate Diagnostic Report
Present the Markdown summary containing:
- Current Commit SHA & Branch
- GitHub Actions workflow status and job results
- Extracted error traces from failed steps
- Local container health

### 4. Autonomous Error Fix (If Requested / If Failures Detected)
If the user asks to fix the errors or if failures are present:
1. Locate the failing code in `services/`.
2. Apply the fix.
3. Validate locally with:
   ```bash
   python3 .agents/skills/git-push-workflow/scripts/pre_push_check.py
   ```
