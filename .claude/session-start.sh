#!/usr/bin/env bash
# PriceOS — SessionStart self-brief.
#
# Output lands in Claude's context at the start of EVERY fresh chat. The
# goal: a new session knows the branch, the live task, and the process
# WITHOUT anyone pointing it anywhere. This is the fix for context-fatigue
# branch drift (a chat lost the thread, switched branches mid-work).
#
# Keep it idempotent and non-fatal — a broken brief must never block a
# session. All failures degrade to a printed note, never a hard exit.
set +e

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT" 2>/dev/null || true

echo "=== PriceOS session start ==="
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "branch: $BRANCH"
echo "head:   $(git log --oneline -1 2>/dev/null)"
echo "tree:   $(test -z "$(git status --porcelain 2>/dev/null)" && echo clean || echo DIRTY)"
npm install --no-audit --no-fund >/dev/null 2>&1 \
  && echo "deps:   installed" \
  || echo "deps:   npm install FAILED (run manually)"

# --- Live WIP state: the thing context-fatigue keeps losing ---
echo ""
echo "===== docs/WIP.md (live task state) ====="
if [ -f docs/WIP.md ]; then
  cat docs/WIP.md
  # Branch guard. WIP records its branch wrapped in backticks; warn loudly
  # if the session is sitting on a different branch than the open task.
  WIP_BRANCH="$(sed -n 's/.*Branch:[^`]*`\([^`]*\)`.*/\1/p' docs/WIP.md | head -1)"
  if [ -n "$WIP_BRANCH" ] && [ -n "$BRANCH" ] && [ "$WIP_BRANCH" != "$BRANCH" ]; then
    echo ""
    echo "!!! BRANCH MISMATCH — WIP task branch is '$WIP_BRANCH' but you are on '$BRANCH'."
    echo "!!! Do NOT work until this is reconciled. Branch drift across fatigued chats is exactly what this guards against — confirm with Brendon."
  fi
else
  echo "(no docs/WIP.md yet — create one the moment a task starts)"
fi

# --- Process checklist ---
echo ""
echo "===== docs/SESSION_STARTER.md (process) ====="
if [ -f docs/SESSION_STARTER.md ]; then
  cat docs/SESSION_STARTER.md
else
  echo "(missing)"
fi

echo ""
echo "Read CLAUDE.md before acting. Ship gates: merge / on-chain deploy / prod data are Brendon's taps."
echo ">> BEFORE ENDING THIS SESSION: update docs/WIP.md (branch · task · decisions · next step). <<"
