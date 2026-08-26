#!/usr/bin/env python3
"""
Pre-push verification script for Antigravity (agy) workflows.
Checks:
  1. Git status & working tree cleanliness
  2. Branch divergence (ahead/behind remote)
  3. Sensitive files safety check (.env, *.pem, *.key, etc.)
  4. In-memory Python syntax check across all services
"""

import os
import sys
import subprocess
import ast
from pathlib import Path

SENSITIVE_PATTERNS = [
    r"^\.env$",
    r"^\.env\.local$",
    r".*\.pem$",
    r".*\.key$",
    r".*id_rsa.*",
    r".*credentials.*\.json$",
]

def run_cmd(cmd: list[str]) -> tuple[int, str, str]:
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def get_git_info():
    code, branch, _ = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    if code != 0:
        print("[ERROR] Not in a git repository.")
        sys.exit(1)
        
    code, commit, _ = run_cmd(["git", "rev-parse", "HEAD"])
    code, short_commit, _ = run_cmd(["git", "rev-parse", "--short", "HEAD"])
    return branch, commit, short_commit

def check_uncommitted():
    code, out, _ = run_cmd(["git", "status", "--porcelain"])
    lines = [l for l in out.splitlines() if l.strip()]
    staged = [l for l in lines if l[0] in "MADRC"]
    unstaged = [l for l in lines if l[1] in "MADRC" or l.startswith("??")]
    return staged, unstaged

def check_sensitive_staged():
    code, out, _ = run_cmd(["git", "diff", "--cached", "--name-only"])
    staged_files = out.splitlines() if out else []
    
    # Also check files in unpushed commits if upstream exists
    code, unpushed, _ = run_cmd(["git", "diff", "@{u}..HEAD", "--name-only"])
    if code == 0 and unpushed:
        staged_files.extend(unpushed.splitlines())

    flagged = []
    import re
    for f in set(staged_files):
        basename = os.path.basename(f)
        for pat in SENSITIVE_PATTERNS:
            if re.match(pat, basename, re.IGNORECASE) or re.match(pat, f, re.IGNORECASE):
                # allow .env.example
                if "example" in f.lower():
                    continue
                flagged.append(f)
    return flagged

def check_python_syntax(root_dir: Path):
    errors = []
    for py_file in root_dir.glob("**/*.py"):
        # Skip virtualenvs or node_modules or caches
        parts = py_file.parts
        if any(p in parts for p in (".venv", "venv", "node_modules", ".git", "__pycache__")):
            continue
        try:
            with open(py_file, "rb") as f:
                code_bytes = f.read()
            ast.parse(code_bytes, filename=str(py_file))
        except SyntaxError as err:
            errors.append((str(py_file), f"Line {err.lineno}: {err.msg}"))
        except Exception as err:
            errors.append((str(py_file), str(err)))
    return errors

def check_remote_status(branch: str):
    print("[*] Checking remote references...")
    # Fetch without failing if offline
    run_cmd(["git", "fetch", "origin", branch])
    code, out, _ = run_cmd(["git", "rev-list", "--left-right", "--count", f"origin/{branch}...HEAD"])
    if code == 0 and out:
        parts = out.split()
        if len(parts) == 2:
            behind, ahead = int(parts[0]), int(parts[1])
            return behind, ahead
    return 0, 0

def main():
    root = Path.cwd()
    branch, commit, short_commit = get_git_info()
    print(f"=== Pre-Push Verification: Branch [{branch}] @ {short_commit} ===")
    
    # 1. Sensitive files
    flagged_secrets = check_sensitive_staged()
    if flagged_secrets:
        print("\n[CRITICAL WARNING] Potential sensitive files detected in staged/unpushed commits:")
        for s in flagged_secrets:
            print(f"  - {s}")
        print("Please verify that these files do not contain private keys or secrets before pushing!")
    else:
        print("[OK] No sensitive files detected in staged/unpushed changes.")

    # 2. Python syntax check
    print("[*] Verifying Python syntax in project services...")
    syntax_errors = check_python_syntax(root)
    if syntax_errors:
        print("\n[FAIL] Python syntax errors detected:")
        for path, err in syntax_errors:
            print(f"  - {path}:\n    {err}")
        sys.exit(1)
    else:
        print("[OK] All Python files parsed successfully without syntax errors.")

    # 3. Uncommitted files
    staged, unstaged = check_uncommitted()
    if unstaged:
        print(f"[NOTE] Working tree has {len(unstaged)} untracked/unstaged changes.")
    if staged:
        print(f"[NOTE] {len(staged)} staged changes waiting to be committed.")

    # 4. Ahead / Behind status
    behind, ahead = check_remote_status(branch)
    print(f"[OK] Remote status: {ahead} commit(s) ahead, {behind} commit(s) behind origin/{branch}.")
    if behind > 0:
        print(f"[WARNING] Local branch is {behind} commits behind remote. Recommendation: `git pull --rebase origin {branch}`.")

    print("\n[SUCCESS] Pre-push verification passed.\n")

if __name__ == "__main__":
    main()
