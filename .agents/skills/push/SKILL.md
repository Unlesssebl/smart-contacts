---
name: push
description: >-
  Triggered via `/push`. Shorthand for /git-push: runs pre-push checks, pushes code, monitors CI/CD logs,
  and initiates an automatic bug-fixing loop if build/test failures occur.
---

# /push Workflow: Quick Safe Push & CI Log Monitoring

This workflow is invoked directly via the **`/push`** slash command in chat.

---

## ⚡ Execution Steps

1. **Pre-push checks**:
   ```bash
   python3 .agents/skills/git-push-workflow/scripts/pre_push_check.py
   ```
2. **Safe Push**:
   ```bash
   bash .agents/skills/git-push-workflow/scripts/git_push.sh
   ```
3. **Monitor CI & Container Logs**:
   ```bash
   python3 .agents/skills/git-push-workflow/scripts/monitor_pipeline.py --timeout=120 --poll-interval=5
   ```
4. **Report & Fix Loop**:
   - Output structured status report.
   - If CI/tests fail: diagnose error logs, apply code fix, commit, and re-push until green.
