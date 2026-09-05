// lib/push/format.ts — turn a ping into the text of a native "3D Pingtoast".
//
// A native (OS) notification is PLAIN TEXT: a bold title line + a body + the
// static app icon. No HTML, no colours, no canvas — but every Unicode glyph
// renders as text, so PD's vocabulary lands on the lock screen on-brand:
//
//   title  = the PriceSprite face of who the ping is ABOUT (ASCII, composed
//            server-side from their frozen resolution — the actor's sprite
//            delivers their own news). Falls back to the recipient's own
//            sprite for pings with no actor (achievements, streaks,
//            reminders, system notices). When it's the actor's face, their
//            @handle sits right beside it (Brendon, 2026-09-05).
//   body   = TWO lines (Brendon, 2026-07-18 — "two-line content"):
//              line 1 (label)  = the per-kind glyph + who/what
//              line 2 (detail) = the specifics
//            so a long to-do or piece name never truncates. iOS's own
//            "from $PRICE" attribution sits between the title and the body.
//
// Reuses renderPing (pure, client-safe) so a 3D Pingtoast reads identically to
// its in-app toast / inbox row.

import { renderPing, type FeedItem } from '@/lib/pings/render';

export interface NativePingText {
  /** Bold top line — the PriceSprite ASCII face (+ actor @handle when it's
   *  their face, not the recipient's own). */
  title: string;
  /** Body — up to two lines: a label line, then a detail line (newline-split). */
  body: string;
  /** Collapse key so a rapid run of same-kind pings stacks instead of spamming. */
  tag: string;
}

export interface FormatNativePingOpts {
  /** The actor's @handle, set only when `spriteFace` is actually THEIR face
   *  (Brendon, 2026-09-05: "move the @name beside the PriceSprite, right
   *  after it" — for pings where the sprite isn't the recipient's own). */
  actorHandle?: string | null;
  /** Live floor for the offer's project (OFFER/COUNTER only) — lets the
   *  recipient size up the offer against the market in the same glance. */
  floorEth?: number | null;
}

const VS15 = '\uFE0E';

/** "0.015⟠" — number then glyph, no space (Brendon, 2026-09-05). Native-push-
 *  only compact form; the shared renderPing() copy keeps "0.015 ETH" for the
 *  in-app panel/toast, so this stays local to the lock-screen format. */
function ethCompact(amount: string | number | null): string | null {
  if (amount == null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return `${parseFloat(n.toFixed(4))}⟠${VS15}`;
}

/** "@cadence #32" — project handle + token, native-push copy of render.ts's
 *  private proj()/tok(); kept local since those aren't exported. */
function whereLabel(item: FeedItem): string {
  const h = item.data?.project_handle;
  const p = typeof h === 'string' && h ? `@${h}` : '';
  const t = item.token_id != null && item.token_id !== '' ? `#${item.token_id}` : '';
  return [p, t].filter(Boolean).join(' ');
}

export function formatNativePing(
  item: FeedItem,
  spriteFace: string,
  opts?: FormatNativePingOpts,
): NativePingText {
  const r = renderPing(item);
  const actorHandle = opts?.actorHandle ?? null;
  const title = actorHandle ? `${spriteFace} ${actorHandle}` : spriteFace;

  /* PingArt ⎀ — the daily transmission IS the notification: the label line,
     then the piece itself (block-shade rows hold their grid in the system
     font). Bypasses the colon-split so the art never gets re-broken. */
  if (item.kind === 'PING' && item.data?.reminder === 'pingart' && typeof item.data?.art === 'string') {
    return {
      title,
      body: `⎀ PingArt\n${item.data.art as string}`,
      tag: 'pd-PINGART',
    };
  }

  // Offer-family reflow (Brendon, 2026-09-05): once the title already names
  // the actor, row 3 leads with the icon + the money verb + amount, and row
  // 4 is free to carry the piece PLUS the live floor — "should I take this?"
  // in one glance, instead of the icon repeating the handle it's next to.
  if (actorHandle && (item.kind === 'OFFER' || item.kind === 'COUNTER')) {
    const eth = ethCompact(item.amount_eth);
    const verb = item.kind === 'OFFER' ? 'offered' : 'countered at';
    const line1 = `${r.icon} ${[verb, eth ?? ''].filter(Boolean).join(' ')}`.trim();
    const where = whereLabel(item) || 'your piece';
    const floor = opts?.floorEth != null ? ` (${ethCompact(opts.floorEth)} floor)` : '';
    return {
      title,
      body: `${line1}\non ${where}${floor}`,
      tag: `pd-${item.kind}`,
    };
  }

  // Split the ping into a LABEL line and a DETAIL line. An actor ping (a real
  // handle) breaks who | what-they-did — unless the handle already moved up
  // into the title, in which case row 3 is just the icon + the action; a
  // label-style ping (To-Do due: X, Unlocked: X, Today: X) breaks at its
  // colon; a free-text reminder with neither stays a single line rather than
  // force an awkward break.
  let line1: string;
  let line2 = '';
  if (r.handle && actorHandle) {
    line1 = `${r.icon} ${r.action}`.trim();
  } else if (r.handle) {
    line1 = `${r.icon} ${r.handle}`.trim();
    line2 = r.action;
  } else {
    const ci = r.action.indexOf(': ');
    if (ci > 0) {
      line1 = `${r.icon} ${r.action.slice(0, ci)}`.trim();
      line2 = r.action.slice(ci + 2);
    } else {
      line1 = `${r.icon} ${r.action}`.trim();
    }
  }
  return {
    title,
    body: line2 ? `${line1}\n${line2}` : line1,
    tag: `pd-${item.kind}`,
  };
}

