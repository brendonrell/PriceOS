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
if [ "$BRANCH" = "main" ]; then
  echo "!!! ON main — PriceOS works in dev ONLY. Do NOT commit/push here; switch to dev or a feature branch. (git-guard will block main writes.)"
fi
echo "head:   $(git log --oneline -1 2>/dev/null)"
echo "tree:   $(test -z "$(git status --porcelain 2>/dev/null)" && echo clean || echo DIRTY)"

# --- Self-heal the recurring "stale dev" divergence ---
# Policy: origin/dev is the ONLY truth; local dev must always mirror it. Past
# chats let commits land directly on local dev, leaving a divergent stale branch
# that kept resurfacing every session. Reconcile on EVERY start so it can never
# come back: fast-sync local dev to origin/dev. Safe + idempotent — when the
# session is on its task branch (the web harness default) this just repoints a
# ref; it never touches a working tree or any unpushed feature-branch work.
git fetch origin dev --quiet 2>/dev/null
if git rev-parse --verify --quiet refs/remotes/origin/dev >/dev/null 2>&1; then
  if [ "$BRANCH" != "dev" ]; then
    if ! git rev-parse --verify --quiet refs/heads/dev >/dev/null 2>&1; then
      git branch dev origin/dev >/dev/null 2>&1
    elif [ "$(git rev-parse dev 2>/dev/null)" != "$(git rev-parse origin/dev 2>/dev/null)" ]; then
      git branch -f dev origin/dev >/dev/null 2>&1 \
        && echo "dev:    re-synced local dev → origin/dev (cleared stale divergence)"
    fi
  elif [ "$(git rev-parse HEAD 2>/dev/null)" != "$(git rev-parse origin/dev 2>/dev/null)" ]; then
    echo "!!! On dev and it differs from origin/dev — run 'git reset --hard origin/dev' before working (stale-dev guard)."
  fi
fi
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
