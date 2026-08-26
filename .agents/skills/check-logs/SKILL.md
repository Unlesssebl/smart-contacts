---
name: check-logs
description: >-
  Triggered via `/check-logs`. Fetches and parses CI/CD and Docker container logs, displays error reports, and initiates debugging.
---

# /check-logs Workflow

1. Retrieve CI/CD and container logs:
   ```bash
   python3 .agents/skills/git-push-workflow/scripts/monitor_pipeline.py --timeout=15
   ```
2. Display diagnostic summary and offer/apply code fixes if errors are detected.
