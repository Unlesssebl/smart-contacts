---
name: git-push
description: >-
  Triggered via `/git-push`. Performs pre-push AST/secret validation, pushes commits to remote,
  monitors CI/CD pipelines and Docker logs, and automatically diagnoses and fixes errors if tests fail.
---

# /git-push Workflow: Safe Push, CI Monitoring & Auto-Fix

This workflow is invoked directly via the **`/git-push`** slash command in chat or autonomously by the agent.

---

## ⚡ Execution Steps

### 1. Pre-Push Validation
Run the pre-push security & syntax validation:
```bash
python3 .agents/skills/git-push-workflow/scripts/pre_push_check.py
```
- Verifies that no sensitive files (`.env`, `*.pem`, `*.key`) are staged or unpushed.
- Verifies Python AST syntax across all services (`api_gateway`, `ad_sync_worker`, `shared`, etc.).
- Verifies remote tracking status.

### 2. Push to Remote
Execute the safe push helper:
```bash
bash .agents/skills/git-push-workflow/scripts/git_push.sh
```

### 3. Monitor CI/CD Pipeline & Inspect Logs
Monitor GitHub Actions and local container status:
```bash
python3 .agents/skills/git-push-workflow/scripts/monitor_pipeline.py --timeout=120 --poll-interval=5
```

### 4. Present Diagnostic Report
Display the formatted markdown status table containing:
- Commit SHA & Branch
- Overall Pipeline Status
- Workflow runs & jobs
- Local container health

### 5. Auto Error-Correction Loop (If Failures Occur)
If errors or test failures are reported in the logs:
1. Identify the exact failing lines and files from the step logs.
2. Apply code fixes directly in the affected files.
3. Validate locally with `pre_push_check.py`.
4. Commit with `git commit -m "fix(...): ..."` and re-push.
5. Re-monitor until all checks pass.
