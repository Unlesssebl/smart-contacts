---
name: git-push
description: Push changes to remote repository, monitor CI/CD logs, generate summary report, and autonomously fix errors.
---

# Git Push & CI Diagnostics Workflow

1. Execute pre-push validations:
   ```bash
   python3 .agents/skills/git-push-workflow/scripts/pre_push_check.py
   ```
2. Push commits to origin:
   ```bash
   bash .agents/skills/git-push-workflow/scripts/git_push.sh
   ```
3. Monitor CI/CD pipeline and container logs:
   ```bash
   python3 .agents/skills/git-push-workflow/scripts/monitor_pipeline.py --timeout=120 --poll-interval=5
   ```
4. If failures occur in CI/CD or runtime logs, analyze stack traces, fix source code, test locally, and re-push until successful.
