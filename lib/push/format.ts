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
//            reminders, system notices).
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
  /** Bold top line — the recipient's PriceSprite ASCII face. */
  title: string;
  /** Body — up to two lines: a label line, then a detail line (newline-split). */
  body: string;
  /** Collapse key so a rapid run of same-kind pings stacks instead of spamming. */
  tag: string;
}

export function formatNativePing(item: FeedItem, spriteFace: string): NativePingText {
  const r = renderPing(item);
  /* PingArt ⎀ — the daily transmission IS the notification: the label line,
     then the piece itself (block-shade rows hold their grid in the system
     font). Bypasses the colon-split so the art never gets re-broken. */
  if (item.kind === 'PING' && item.data?.reminder === 'pingart' && typeof item.data?.art === 'string') {
    return {
      title: spriteFace,
      body: `⎀ PingArt\n${item.data.art as string}`,
      tag: 'pd-PINGART',
    };
  }
  // Split the ping into a LABEL line and a DETAIL line. An actor ping (a real
  // handle) breaks who | what-they-did; a label-style ping (To-Do due: X,
  // Unlocked: X, Today: X) breaks at its colon; a free-text reminder with
  // neither stays a single line rather than force an awkward break.
  let line1: string;
  let line2 = '';
  if (r.handle) {
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
    title: spriteFace,
    body: line2 ? `${line1}\n${line2}` : line1,
    tag: `pd-${item.kind}`,
  };
}
