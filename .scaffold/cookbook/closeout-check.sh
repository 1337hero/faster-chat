#!/usr/bin/env bash
# scaffold-code closeout floor — the outcome gate for any shell-capable agent. Run from anywhere
# in the repo. Verifies outcomes, not process: nothing shipped → passes silently; code changed →
# must be off the default branch, have a log entry as fresh as the code, and contain no secrets.
# note: session ≈ branch — code changes are measured against the merge-base with the default
# branch, so log changes count whether committed or not.
fail() { echo "FAIL: $1"; exit 1; }
cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || fail "not in a git repo"
[ -f .scaffold/BOOT.md ] || fail "no .scaffold/ at repo root"

default=$(git symbolic-ref -q --short refs/remotes/origin/HEAD)
default=${default#origin/}
default=${default:-main}

base=""
for ref in "origin/$default" "$default"; do
  base=$(git merge-base "$ref" HEAD 2>/dev/null) && break
done
[ -n "$base" ] || fail "no $default ref to diff against"

# code changes = branch diff vs merge-base + dirty/untracked paths, outside .scaffold/
dirty=$(git status --porcelain | cut -c4- | sed 's/.* -> //' | grep -v '^\.scaffold/')
changed=$( { git diff --name-only "$base"; echo "$dirty"; } | grep -v '^\.scaffold/' | grep -v '^$' | sort -u)
if [ -z "$changed" ]; then
  echo "OK: no code changes — closeout floor not required"
  exit 0
fi

[ "$(git rev-parse --abbrev-ref HEAD)" != "$default" ] || fail "code changed on $default — branch first"

# log freshness: the newest log entry must be at least as new as the newest code change
if [ -n "$dirty" ]; then
  last_change=$(date +%Y-%m-%d)
else
  last_change=$(git log -1 --format=%cs "$base"..HEAD -- . ':!.scaffold' 2>/dev/null)
fi
latest_log=$(ls .scaffold/memory/log/*.md 2>/dev/null | sed 's|.*/||' | sort | tail -1 | cut -c1-10)
[ -n "$latest_log" ] || fail "no log entry in .scaffold/memory/log/"
[ "$latest_log" \< "$last_change" ] && fail "no log entry since the last code change ($last_change)"

# secrets: added lines only; requires a quoted literal value so `apiKey: process.env.X` (reference by name)
# passes, and the value must not start with "/" so URL paths like paymentToken: "/payment-token/X" pass
git diff "$base" | grep -E '^\+' | grep -iqE "(api[_-]?key|secret|password|token)[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9+_-][A-Za-z0-9+/_-]{15,}" && fail "possible secret in diff"
echo "OK: closeout floor satisfied"
