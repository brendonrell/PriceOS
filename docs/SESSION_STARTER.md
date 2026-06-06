# Session Starter — Fresh Chat Checklist

Each Claude Code on the web session runs in a **fresh, ephemeral container**. The
chat transcript persists across sessions, but the live environment (and its MCP
connectors) is rebuilt every time. So at the start of any new chat, re-verify
state before trusting it — connectors can show as "loaded" but not be
authenticated, and that failure is usually on the input/auth side, not the
service's.

## 1. Repo state
- [ ] `git status` — confirm clean tree and the expected branch
- [ ] `git log --oneline -5` — confirm latest commits are present
- [ ] Commit + push before ending a session — uncommitted work dies with the container

## 2. Connectors (8 total) — verify *live*, not just *loaded*
"Loaded" = schema registered. "Live" = a real read-only call returns data.
Run one cheap read per server:

| Connector | Liveness check (read-only) |
|-----------|----------------------------|
| ClickUp   | `clickup_get_workspace_hierarchy` (max_depth 0) |
| GitHub    | session is scoped to the repo; `get_me` to confirm |
| Supabase  | `list_projects` |
| Vercel    | `list_teams` |
| Netlify   | user reader → `get-user` |
| Figma     | `whoami` (note: seat may be **View/read-only** — writes will fail by permission, not connection) |
| Calendar  | `list_calendars` |
| Drive     | `list_recent_files` |

If a call comes back empty or errors: suspect **your lookup term / ID first**
(connectors expect exact, often digit-only IDs and resolve names fuzzily), then
auth, then the service.

## 3. Context hygiene
- One chat ≈ one cohesive task. Start a fresh chat for unrelated work.
- A long but focused chat is fine — context auto-compacts. Reset only when
  answers start repeating, contradicting earlier decisions, or "forgetting"
  stated constraints.
- On reset, paste the few key facts forward (branch, task, decisions).
