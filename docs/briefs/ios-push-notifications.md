# Opus Brief — iOS Push Notifications: finish + verify end-to-end

**From the 2026-07-05 Fable session. Everything below is code-verified or
live-deploy-verified — not guessed.** Your job: get real iOS notifications
landing on Brendon's phone, and harden the pipeline. Do NOT rebuild what
exists — the pipeline is complete; it has one confirmed blocker and an
untested tail.

## What already exists (all real, all shipped on dev)

- **Client subscribe** — `lib/push/client.ts`: `enable()` registers the SW,
  subscribes with the VAPID public key, POSTs the subscription to the server.
  Key read: `NEXT_PUBLIC_WEBPUSH_KEY || NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''`;
  empty ⇒ returns `'unsupported'` (silent).
- **Routes** — `app/api/push/subscribe` + `unsubscribe`.
- **Server send** — `lib/push/webpush.ts`: `sendNativePing` (pings) +
  `sendTodoReminder` (to-dos), gated on Pingtoasts-3D mode + Silent Mode. The
  server deliberately signs with the SAME `NEXT_PUBLIC_WEBPUSH_KEY` first so
  the pair can never drift from what clients subscribed with (old
  `VAPID_PUBLIC_KEY`/`WEBPUSH_PRIVATE_KEY` names remain as fallbacks).
- **Cron** — `app/api/cron/todo-reminders` fired every 2 min by
  `custom-worker.ts` (fail-closed on `CRON_SECRET`).
- **UI** — MY PINGS → Pingtoasts cycle OFF → ON → 3D → COMBO; toasts
  `3D Pingtoasts: ON / BLOCKED / ADD TO HOME SCREEN`.

## THE CONFIRMED BLOCKER (verified against the live worker 2026-07-05)

The served bundle still contains the **unresolved** env expression
(`a.env.NEXT_PUBLIC_WEBPUSH_KEY||a.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||""`) —
proof that **`NEXT_PUBLIC_WEBPUSH_KEY` is NOT set in the Worker's BUILD
variables** (build-time-set vars get inlined as literals). Every device
therefore takes the `'unsupported'` path and nothing ever subscribes. The
runtime (sending) secrets Brendon stored are the other half and are fine.

**Brendon's tap (filed: ClickUp `86barg5yz`, assigned + due):** add
`NEXT_PUBLIC_WEBPUSH_KEY` = the VAPID public key to **Build → Variables** in
the Cloudflare dashboard, then rebuild `dev`. Verify the fix landed by
fetching the layout chunk and confirming a literal `"B…"` key replaced the
env expression.

## Opus checklist (after the build var lands)

1. **On-device smoke (Brendon's iPhone, installed PWA — iOS requires the
   Home-Screen app, 16.4+):** MY PINGS → 3D → permission prompt → expect
   `3D Pingtoasts: ON`. Confirm a row lands in the push-subscriptions table.
2. **Deliver a real notification:** trigger a ping (or a dated to-do a
   minute out) and confirm it lands with the app CLOSED.
3. **iOS-specific hardening to verify in code:**
   - The SW `push` handler MUST call `showNotification` on every push — iOS
     revokes subscriptions of pushes that display nothing. Check `public/`
     service worker.
   - 404/410 responses from the push service must delete the dead
     subscription row (check `webpush.ts` cleanup path).
   - `web-push` on workerd: the WIP notes say signing was made worker-safe at
     the Cloudflare migration — verify a send executes on the LIVE worker,
     not just locally (check worker logs for the todo-reminder cron).
4. **Notification content:** title/body/casing per the toast rules, tap-through
   URL opens the right surface in the PWA (check `data.url` handling in the SW
   click handler).
5. Update ClickUp `86barg5yz` + `docs/WIP.md` with the outcome.

## Constraint

Do not change the key-reading order in `webpush.ts`/`client.ts` (the shared
NEXT_PUBLIC key is deliberate), and no new env var names — the whole point of
the 2026-07-05 cleanup was one canonical pair.
