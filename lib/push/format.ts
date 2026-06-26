// lib/push/format.ts — turn a ping into the text of a native "3D Pingtoast".
//
// A native (OS) notification is PLAIN TEXT: a bold title line + a body line +
// the static app icon. No HTML, no colours, no canvas — but every Unicode glyph
// renders as text, so PD's vocabulary lands on the lock screen on-brand:
//
//   top row (title) = the recipient's PriceSprite face (ASCII, composed server-
//                     side from their frozen resolution — their own sprite tells
//                     them the news)
//   bottom row (body) = the canonical per-kind ping glyph (GLYPHS.md / the MY
//                     PINGS pills) + the ping content
//
// Reuses renderPing (pure, client-safe) so a 3D Pingtoast reads identically to
// its in-app toast / inbox row.

import { renderPing, type FeedItem } from '@/lib/pings/render';

export interface NativePingText {
  /** Bold top line — the recipient's PriceSprite ASCII face. */
  title: string;
  /** Body line — canonical ping glyph + the content (actor + action). */
  body: string;
  /** Collapse key so a rapid run of same-kind pings stacks instead of spamming. */
  tag: string;
}

export function formatNativePing(item: FeedItem, spriteFace: string): NativePingText {
  const r = renderPing(item);
  const content = [r.handle, r.action].filter(Boolean).join(' ').trim();
  return {
    title: spriteFace,
    body: `${r.icon} ${content}`.trim(),
    tag: `pd-${item.kind}`,
  };
}
