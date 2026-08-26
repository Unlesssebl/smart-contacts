#!/usr/bin/env python3
"""
Pipeline & CI Log Monitor for Antigravity (agy) Git Workflow.
Fetches GitHub Actions workflow runs, commit check-runs, statuses, and container logs.
Generates structured Markdown reports and extracts error diagnostics.
"""

import os
import sys
import json
import time
import re
import argparse
import subprocess
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List

def run_cmd(cmd: List[str]) -> tuple[int, str, str]:
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def get_git_remote_repo() -> tuple[Optional[str], Optional[str]]:
    code, out, _ = run_cmd(["git", "remote", "get-url", "origin"])
    if code != 0 or not out:
        return None, None
    m = re.search(r"github\.com[:/]([^/]+)/([^/\.]+)(?:\.git)?", out)
    if m:
        return m.group(1), m.group(2)
    return None, None

def get_current_git_meta() -> tuple[str, str, str]:
    _, branch, _ = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    _, commit, _ = run_cmd(["git", "rev-parse", "HEAD"])
    _, short_commit, _ = run_cmd(["git", "rev-parse", "--short", "HEAD"])
    return branch, commit, short_commit

def make_github_request(url: str, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Antigravity-Git-Workflow/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        try:
            err_body = e.read().decode("utf-8")
            err_json = json.loads(err_body)
            msg = err_json.get("message", str(e))
        except Exception:
            msg = str(e)
        return None
    except Exception:
        return None

def fetch_workflow_runs(owner: str, repo: str, commit_sha: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs?head_sha={commit_sha}"
    res = make_github_request(url, token)
    if res and "workflow_runs" in res and len(res["workflow_runs"]) > 0:
        return res["workflow_runs"]
    
    url_recent = f"https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page=5"
    res_recent = make_github_request(url_recent, token)
    if res_recent and "workflow_runs" in res_recent:
        matched = [r for r in res_recent["workflow_runs"] if r.get("head_sha") == commit_sha]
        if matched:
            return matched
    return []

def fetch_check_runs(owner: str, repo: str, commit_sha: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    url = f"https://api.github.com/repos/{owner}/{repo}/commits/{commit_sha}/check-runs"
    res = make_github_request(url, token)
    if res and "check_runs" in res:
        return res["check_runs"]
    return []

def fetch_job_details(jobs_url: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    res = make_github_request(jobs_url, token)
    if res and "jobs" in res:
        return res["jobs"]
    return []

def check_docker_containers() -> Optional[Dict[str, Any]]:
    code, out, _ = run_cmd(["docker", "compose", "ps", "--format", "json"])
    if code != 0 or not out:
        return None
    try:
        containers = []
        for line in out.splitlines():
            line = line.strip()
            if line:
                containers.append(json.loads(line))
        return {"containers": containers}
    except Exception:
        return None

def monitor_github_ci(owner: str, repo: str, commit_sha: str, timeout: int = 120, poll_interval: int = 5, token: Optional[str] = None):
    start_time = time.time()
    print(f"[*] Checking GitHub CI status for {owner}/{repo} @ {commit_sha[:7]}...")
    
    runs = fetch_workflow_runs(owner, repo, commit_sha, token)
    check_runs = fetch_check_runs(owner, repo, commit_sha, token)
    
    if not runs and not check_runs:
        if timeout <= 10:
            return {"status": "no_ci", "runs": [], "check_runs": []}
            
        print(f"[*] Waiting up to {timeout}s for GitHub CI trigger...")
        while time.time() - start_time < min(timeout, 25):
            time.sleep(poll_interval)
            runs = fetch_workflow_runs(owner, repo, commit_sha, token)
            check_runs = fetch_check_runs(owner, repo, commit_sha, token)
            if runs or check_runs:
                break
        
        if not runs and not check_runs:
            return {"status": "no_ci", "runs": [], "check_runs": []}

    while time.time() - start_time < timeout:
        all_completed = True
        has_failure = False
        
        for run in runs:
            status = run.get("status")
            conclusion = run.get("conclusion")
            if status != "completed":
                all_completed = False
            elif conclusion in ["failure", "cancelled", "timed_out"]:
                has_failure = True
                
        for cr in check_runs:
            status = cr.get("status")
            conclusion = cr.get("conclusion")
            if status != "completed":
                all_completed = False
            elif conclusion in ["failure", "cancelled", "timed_out"]:
                has_failure = True

        if all_completed:
            return {
                "status": "failure" if has_failure else "success",
                "runs": runs,
                "check_runs": check_runs
            }
        
        print(f"[*] CI is in progress... ({int(time.time() - start_time)}s elapsed)")
        time.sleep(poll_interval)
        runs = fetch_workflow_runs(owner, repo, commit_sha, token)
        check_runs = fetch_check_runs(owner, repo, commit_sha, token)

    return {"status": "timeout", "runs": runs, "check_runs": check_runs}

def format_ports(publishers: Any) -> str:
    if not publishers:
        return "-"
    if isinstance(publishers, list):
        formatted = []
        for p in publishers:
            if isinstance(p, dict):
                pub = p.get("PublishedPort", "")
                tgt = p.get("TargetPort", "")
                proto = p.get("Protocol", "tcp")
                if pub and tgt:
                    formatted.append(f"{pub}->{tgt}/{proto}")
                elif tgt:
                    formatted.append(f"{tgt}/{proto}")
        return ", ".join(formatted) if formatted else "-"
    return str(publishers)

def generate_markdown_report(meta: Dict[str, Any], ci_result: Dict[str, Any], token: Optional[str] = None) -> str:
    branch = meta["branch"]
    commit_sha = meta["commit_sha"]
    short_sha = commit_sha[:7]
    owner = meta.get("owner", "")
    repo = meta.get("repo", "")
    ci_status = ci_result.get("status", "unknown")

    status_badges = {
        "success": "🟢 **PASSED / SUCCESS**",
        "failure": "🔴 **FAILED / ACTION REQUIRED**",
        "timeout": "🟡 **TIMED OUT (STILL IN PROGRESS)**",
        "no_ci": "⚪ **NO CI RUNS DETECTED**",
    }
    status_header = status_badges.get(ci_status, f"🔵 **{ci_status.upper()}**")

    lines = []
    lines.append(f"# 🚀 Git Push & CI Pipeline Report\n")
    lines.append(f"| Property | Value |")
    lines.append(f"| :--- | :--- |")
    lines.append(f"| **Repository** | `{owner}/{repo}` |")
    lines.append(f"| **Branch** | `{branch}` |")
    lines.append(f"| **Commit** | `{short_sha}` (`{commit_sha}`) |")
    lines.append(f"| **Pipeline Status** | {status_header} |")
    lines.append("")

    runs = ci_result.get("runs", [])
    check_runs = ci_result.get("check_runs", [])

    if runs:
        lines.append("## 📦 GitHub Actions Workflows")
        lines.append("| Workflow Name | Event | Status | Conclusion | URL |")
        lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for r in runs:
            name = r.get("name", "Workflow")
            event = r.get("event", "push")
            st = r.get("status", "unknown")
            conc = r.get("conclusion") or "running"
            url = r.get("html_url", "#")
            icon = "✅" if conc == "success" else ("❌" if conc == "failure" else "⏳")
            lines.append(f"| {name} | `{event}` | {st} | {icon} `{conc}` | [View Run]({url}) |")
        lines.append("")

        for r in runs:
            if r.get("conclusion") == "failure":
                lines.append(f"### ❌ Failure Details: {r.get('name')}")
                jobs_url = r.get("jobs_url")
                if jobs_url:
                    jobs = fetch_job_details(jobs_url, token)
                    for j in jobs:
                        if j.get("conclusion") == "failure":
                            lines.append(f"- **Failed Job**: `{j.get('name')}`")
                            for step in j.get("steps", []):
                                if step.get("conclusion") == "failure":
                                    lines.append(f"  - **Failing Step**: `{step.get('name')}` (Status: `{step.get('conclusion')}`)")
                            if j.get("html_url"):
                                lines.append(f"  - **Direct Job Link**: [Open Job]({j.get('html_url')})")
                lines.append("")

    elif check_runs:
        lines.append("## 📦 Commit Check Runs")
        lines.append("| Check Name | Status | Conclusion | URL |")
        lines.append("| :--- | :--- | :--- | :--- |")
        for cr in check_runs:
            name = cr.get("name", "Check")
            st = cr.get("status", "unknown")
            conc = cr.get("conclusion") or "running"
            url = cr.get("html_url", "#")
            icon = "✅" if conc == "success" else ("❌" if conc == "failure" else "⏳")
            lines.append(f"| {name} | {st} | {icon} `{conc}` | [View Check]({url}) |")
        lines.append("")
    else:
        lines.append("> [!NOTE]")
        lines.append("> No GitHub Actions workflow runs were registered for this commit on GitHub.")
        lines.append("")

    docker_res = check_docker_containers()
    if docker_res and docker_res.get("containers"):
        lines.append("## 🐳 Local Service Containers")
        lines.append("| Service | State | Status | Ports |")
        lines.append("| :--- | :--- | :--- | :--- |")
        for c in docker_res["containers"]:
            svc = c.get("Service", c.get("Name", "container"))
            state = c.get("State", "unknown")
            st = c.get("Status", "")
            ports_fmt = format_ports(c.get("Publishers", c.get("Ports")))
            icon = "🟢" if state == "running" else "🔴"
            lines.append(f"| {svc} | {icon} `{state}` | {st} | `{ports_fmt}` |")
        lines.append("")

    if ci_status == "failure":
        lines.append("## 🛠️ Recommended Action Items")
        lines.append("1. **Analyze error logs** from the failed steps listed above.")
        lines.append("2. **Reproduce and fix** the error locally.")
        lines.append("3. Run `pre_push_check.py` to verify the fix.")
        lines.append("4. Commit with `git commit -m \"fix(...): resolve CI failure\"` and push again.")
    elif ci_status == "success":
        lines.append("## 🎉 Summary")
        lines.append("All checks and workflow runs completed successfully! No further action required.")

    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Monitor CI/CD runs and generate push reports.")
    parser.add_argument("--branch", help="Target branch name")
    parser.add_argument("--commit", help="Commit SHA to check")
    parser.add_argument("--timeout", type=int, default=30, help="Max wait time in seconds")
    parser.add_argument("--poll-interval", type=int, default=5, help="Polling interval in seconds")
    parser.add_argument("--output", choices=["markdown", "json"], default="markdown", help="Output format")
    args = parser.parse_args()

    branch, commit, short_sha = get_current_git_meta()
    if args.branch:
        branch = args.branch
    if args.commit:
        commit = args.commit

    owner, repo = get_git_remote_repo()
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")

    meta = {
        "branch": branch,
        "commit_sha": commit,
        "owner": owner,
        "repo": repo,
    }

    if not owner or not repo:
        print("[!] Could not determine GitHub owner/repo from git remote origin.", file=sys.stderr)
        ci_result = {"status": "no_ci", "runs": [], "check_runs": []}
    else:
        ci_result = monitor_github_ci(
            owner=owner,
            repo=repo,
            commit_sha=commit,
            timeout=args.timeout,
            poll_interval=args.poll_interval,
            token=token,
        )

    if args.output == "json":
        print(json.dumps({"meta": meta, "ci": ci_result}, indent=2))
    else:
        report = generate_markdown_report(meta, ci_result, token)
        print(report)

    if ci_result.get("status") == "failure":
        sys.exit(1)
    elif ci_result.get("status") == "timeout":
        sys.exit(2)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
