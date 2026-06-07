#!/usr/bin/env bash
# PreToolUse git-guard for PriceOS.
#
# THE RULE: we work ONLY in dev — feature branch → PR → dev. `main` is
# off-limits except as a discrete, explicit, Brendon-driven task. This hook
# physically blocks any git WRITE op that touches main, from any chat, so a
# context-fatigued session can never push to main by accident.
#
# Escape hatch for the ONE deliberate main moment (after Brendon's approval):
# prefix the command with PD_ALLOW_MAIN=1, e.g.
#   PD_ALLOW_MAIN=1 git push origin main
#
# Non-fatal by design: anything unexpected exits 0 (allow) rather than
# wedging the session. The block path is exit 2 (PreToolUse = deny + show
# stderr to Claude).
set +e

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

# Only inspect git commands.
printf '%s' "$cmd" | grep -qE '\bgit\b' || exit 0

# Deliberate-main escape hatch (inline env or exported).
printf '%s' "$cmd" | grep -qE '\bPD_ALLOW_MAIN=1\b' && exit 0
[ "${PD_ALLOW_MAIN:-}" = "1" ] && exit 0

deny() {
  echo "⛔ PriceOS git-guard BLOCKED: $1" >&2
  echo "Rule: work ONLY in dev (feature branch → PR → dev). main is a discrete, explicit task." >&2
  echo "If this IS the approved main moment, re-run prefixed with:  PD_ALLOW_MAIN=1 <command>" >&2
  exit 2
}

cur="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"

# A) Any git write op while sitting ON main (covers "merge X into main",
#    "commit on main", etc.).
if printf '%s' "$cmd" | grep -qE '\bgit\s+(commit|merge|rebase|cherry-pick|push|reset|am|revert)\b'; then
  [ "$cur" = "main" ] && deny "git write op while current branch is main"
fi

# B) A push that TARGETS main, regardless of current branch. Token-exact so
#    'domain', 'feature/main-nav', etc. don't false-positive.
if printf '%s' "$cmd" | grep -qE '\bgit\s+push\b'; then
  for tok in $cmd; do
    case "$tok" in
      main|origin/main|*:main) deny "git push targeting main ($tok)";;
    esac
  done
fi

# Reading/checking out main is fine — not blocked.
exit 0
