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
# Segment-aware: a compound command is split on && || ; | and newlines, and
# only the segment whose actual command is `git push` is checked for a main
# refspec. This avoids false positives when the word "main" appears elsewhere
# (e.g. inside a `git commit -m "...main..."` message in the same line).
#
# Non-fatal by design: anything unexpected exits 0 (allow). Block path is
# exit 2 (PreToolUse = deny + show stderr to Claude).
set +e

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

# Only inspect commands that involve git at all.
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

# Split the compound command into segments on && || ; | and newlines.
segs="$(printf '%s' "$cmd" | sed -E 's/\|\|/\n/g; s/&&/\n/g; s/;/\n/g; s/\|/\n/g')"

while IFS= read -r seg; do
  # Trim leading whitespace.
  seg="${seg#"${seg%%[![:space:]]*}"}"
  # Strip leading env assignments (VAR=val ) to reach the real command head.
  head="$seg"
  while printf '%s' "$head" | grep -qE '^[A-Za-z_][A-Za-z0-9_]*=[^ ]* '; do
    head="${head#* }"
  done
  # Only inspect segments whose command is git.
  case "$head" in
    git\ *|git) ;;
    *) continue;;
  esac

  # A) push targeting main — scan refspec tokens of THIS push segment only.
  if printf '%s' "$head" | grep -qE '^git[[:space:]]+push\b'; then
    for tok in $head; do
      case "$tok" in
        main|origin/main|*:main) deny "git push targeting main ($tok)";;
      esac
    done
  fi

  # B) any git write op while sitting ON main.
  if printf '%s' "$head" | grep -qE '^git[[:space:]]+(commit|merge|rebase|cherry-pick|push|reset|am|revert)\b'; then
    [ "$cur" = "main" ] && deny "git write op while current branch is main"
  fi
done <<EOF
$segs
EOF

# Reading/checking out main is fine — not blocked.
exit 0
