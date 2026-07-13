/*
 * The Dispatch DIGEST — PD's email edition (Resend), an extension of the
 * morning paper. Three editions a month (the 1st, 11th and 22nd, Montreal
 * time), each covering the stretch since the previous one. Everything is
 * assembled from the live ledger — zero generated prose, the platform
 * reporting itself, $0 to build.
 *
 * The email contract (Brendon, 2026-07-13): a BREATHABLE above-the-fold —
 * masthead, the window's defining artwork big, three pulse numbers — then a
 * DENSE bottom half with real value: the sales ledger, what came through the
 * filter, the floors, a wall of recent pieces. The art is never shy: every
 * image is a stored PNG preview and every one links back to its piece.
 *
 * Email HTML rules obeyed throughout: table layout, inline styles only,
 * web-safe fonts, absolute URLs, block images with width/height/alt.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProject, artImageUrl, artThumbUrl } from '@/lib/project/registry';
import { formatEth } from '@/lib/format/eth';
import { DISCORD_URL } from '@/lib/config/discord';

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://pricediscussion.pricediscussion.workers.dev';

/** Digest publication days of the month (Montreal calendar). */
export const DIGEST_DAYS = [1, 11, 22] as const;

/** The "Dispatch Digest" Resend segment (created 2026-07-13; not a secret). */
export const DIGEST_SEGMENT_ID = 'fb22999d-a121-4feb-aaa8-84d69994492c';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Montreal-local {y, m (1-12), d} for a given instant. */
export function montrealYMD(at: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** The covered window for an edition published on Montreal date {y,m,d}:
 *  from the PREVIOUS digest day (inclusive) up to publication. Returned as
 *  UTC epoch-seconds bounds (approximate day bounds are fine — the ledger
 *  window just needs to tile cleanly edition to edition). */
export function digestWindow(y: number, m: number, d: number): { fromSec: number; toSec: number; label: string } {
  let py = y, pm = m, pd: number;
  if (d === 1) { pd = 22; pm = m - 1; if (pm === 0) { pm = 12; py = y - 1; } }
  else if (d === 11) pd = 1;
  else pd = 11;
  const from = Date.UTC(py, pm - 1, pd, 4, 0, 0); // ~midnight Montreal
  const to = Date.UTC(y, m - 1, d, 4, 0, 0);
  const label =
    pm === m
      ? `${MONTHS[m - 1]} ${pd}–${d}`
      : `${MONTHS[pm - 1]} ${pd} – ${MONTHS[m - 1]} ${d}`;
  return { fromSec: Math.floor(from / 1000), toSec: Math.floor(to / 1000), label };
}

interface SaleRow { project_id: string; token_id: string; price_eth: number; timestamp: number }

export interface DigestBuild {
  subject: string;
  previewText: string;
  html: string;
  text: string;
  /** True when the window held literally nothing — caller skips the send. */
  empty: boolean;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ── THE STAMP — this edition's one-of-one generative mark ─────────────
 * Tabstract-spirit: deterministic art seeded by the edition itself, so
 * every EDITION (not every recipient) carries a unique piece. Email
 * clients strip SVG and script, so the medium is the one thing they all
 * render faithfully: a table of coloured cells. Mirror-symmetric grid,
 * house ink plus one seeded accent hue — a wax seal in pixels. */
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function hslToHex(h: number, s: number, l: number): string {
  const a = (s * Math.min(l, 1 - l));
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function editionStamp(editionName: string): string {
  const seed = fnv(editionName);
  const accent = hslToHex(seed % 360, 0.72, 0.46);
  const accent2 = hslToHex((seed >>> 9) % 360, 0.68, 0.62);
  const N = 11;             // odd → a true spine down the middle
  const CELL = 13;
  const rows: string[] = [];
  for (let y = 0; y < N; y++) {
    // Row density breathes down the grid (denser waist, airy edges).
    const density = 32 + ((fnv(`${editionName}:row${y}`) % 5) * 9) + (y > 2 && y < 8 ? 14 : 0);
    const cells: string[] = [];
    for (let x = 0; x < N; x++) {
      const mx = Math.min(x, N - 1 - x); // vertical-mirror symmetry
      const v = fnv(`${editionName}:${mx}:${y}`);
      const on = (v % 100) < density;
      const color = !on ? '#ffffff' : (v >>> 7) % 5 === 0 ? accent2 : (v >>> 3) % 3 === 0 ? accent : '#111111';
      cells.push(`<td width="${CELL}" height="${CELL}" bgcolor="${color}" style="width:${CELL}px;height:${CELL}px;background-color:${color};font-size:1px;line-height:1px;">&nbsp;</td>`);
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return `<table cellpadding="0" cellspacing="0" border="0"><tbody>${rows.join('')}</tbody></table>`;
}

function pieceName(slug: string, tokenId: string | number): string {
  return `${getProject(slug)?.displayName ?? slug.toUpperCase()} #${tokenId}`;
}
function pieceUrl(slug: string, tokenId: string | number): string {
  return `${SITE}/art/${slug}/${tokenId}`;
}
function dayStamp(sec: number): string {
  const d = new Date(sec * 1000);
  const p = montrealYMD(d);
  return `${MONTHS[p.m - 1]} ${p.d}`;
}

/** Build the digest covering the window that ends on Montreal date {y,m,d}.
 *  `hasArt` verifies a piece's stored preview actually exists (the cron passes
 *  an R2 head-probe — previews pin on first VIEW, so unviewed pieces have
 *  none and must never be printed as blanks). Defaults to trusting. */
export async function buildDigest(
  db: SupabaseClient, y: number, m: number, d: number,
  hasArt: (slug: string, tokenId: number) => Promise<boolean> = async () => true,
): Promise<DigestBuild> {
  const { fromSec, toSec, label } = digestWindow(y, m, d);
  // The edition's identity — also the broadcast's idempotency name and THE
  // STAMP's seed, so the mark is reproducible forever from the date alone.
  const editionName = `pd-digest-${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const [salesRes, mintsRes, projectsRes] = await Promise.all([
    db.from('events')
      .select('project_id, token_id, price_eth, timestamp')
      .eq('type', 'XFER').not('price_eth', 'is', null)
      .gte('timestamp', fromSec).lt('timestamp', toSec)
      .order('price_eth', { ascending: false })
      .limit(200),
    db.from('events')
      .select('project_id, token_id, timestamp')
      .eq('type', 'MINT')
      .gte('timestamp', fromSec).lt('timestamp', toSec)
      .order('timestamp', { ascending: false })
      .limit(500),
    db.from('projects')
      .select('id, uploaded_at, floor_price_eth, minted_count'),
  ]);

  const sales = ((salesRes.data ?? []) as SaleRow[]).map((r) => ({ ...r, price_eth: Number(r.price_eth) }));
  const mints = (mintsRes.data ?? []) as { project_id: string; token_id: string; timestamp: number }[];
  const projects = (projectsRes.data ?? []) as {
    id: string; uploaded_at: string | null; floor_price_eth: string | number | null; minted_count: number | null;
  }[];

  const vol = sales.reduce((s, r) => s + r.price_eth, 0);
  const topSale = sales[0] ?? null;
  const fresh = projects.filter((p) => {
    const t = p.uploaded_at ? Math.floor(new Date(p.uploaded_at).getTime() / 1000) : null;
    return t != null && t >= fromSec && t < toSec && getProject(p.id);
  });

  // Window activity per project (mints + sales) drives the floors table.
  const activity = new Map<string, number>();
  for (const e of mints) activity.set(e.project_id, (activity.get(e.project_id) ?? 0) + 1);
  for (const e of sales) activity.set(e.project_id, (activity.get(e.project_id) ?? 0) + 1);
  const floorRows = Array.from(activity.entries())
    .filter(([slug]) => getProject(slug))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, acts]) => {
      const p = projects.find((r) => r.id === slug);
      const def = getProject(slug)!;
      const floor = p?.floor_price_eth != null && Number(p.floor_price_eth) > 0 ? Number(p.floor_price_eth) : null;
      return { slug, name: def.displayName, artist: def.artistHandle ?? null, acts, floor, minted: p?.minted_count ?? 0, supply: def.outputs };
    });

  // The hero: the window's best piece WITH stored art — top sales first,
  // then recent mints. Bounded probes; no candidate = no hero block.
  let hero: { slug: string; id: string; line: string } | null = null;
  for (const s of sales.slice(0, 5)) {
    if (await hasArt(s.project_id, Number(s.token_id))) {
      hero = { slug: s.project_id, id: s.token_id, line: `TOP SALE · ${pieceName(s.project_id, s.token_id)} · ◊${formatEth(s.price_eth)} ETH` };
      break;
    }
  }
  if (!hero) {
    for (const e of mints.slice(0, 5)) {
      if (await hasArt(e.project_id, Number(e.token_id))) {
        hero = { slug: e.project_id, id: e.token_id, line: `FRESH MINT · ${pieceName(e.project_id, e.token_id)}` };
        break;
      }
    }
  }

  // The gallery wall: up to 6 recent mints whose art is verifiably stored.
  const wall: { project_id: string; token_id: string }[] = [];
  for (const e of mints.slice(0, 15)) {
    if (wall.length >= 6) break;
    if (await hasArt(e.project_id, Number(e.token_id))) wall.push(e);
  }

  const empty = !hero && sales.length === 0 && mints.length === 0 && fresh.length === 0;

  const subject = `THE PD DISPATCH DIGEST · ${label}${vol > 0 ? ` · ◊${formatEth(vol)} moved` : ''}`;
  const previewText = topSale
    ? `${pieceName(topSale.project_id, topSale.token_id)} led the tape at ◊${formatEth(topSale.price_eth)} — the full ledger inside.`
    : `${mints.length} mints, ${fresh.length} new project${fresh.length === 1 ? '' : 's'} through the filter — the full ledger inside.`;

  /* ── HTML ─────────────────────────────────────────────────────────── */
  const MONO = "'Courier New', Courier, monospace";
  const cell = (inner: string, style = '') =>
    `<td style="font-family:${MONO};color:#111111;${style}">${inner}</td>`;
  const rule = (t: string) =>
    `<tr><td style="font-family:${MONO};color:#111111;font-size:12px;font-weight:bold;letter-spacing:2px;border-bottom:1px solid #111111;padding-top:28px;padding-bottom:5px;">${t}</td></tr>`;

  const heroImg = hero ? artImageUrl(hero.slug, Number(hero.id)) : null;
  const heroBlock = hero && heroImg ? `
    <tr><td style="padding-top:26px;" align="center">
      <a href="${pieceUrl(hero.slug, hero.id)}" style="text-decoration:none;">
        <img src="${heroImg}" alt="${esc(pieceName(hero.slug, hero.id))}" width="560" height="560" border="0" style="display:block;width:100%;max-width:560px;height:auto;" />
      </a>
    </td></tr>
    <tr><td align="center" style="font-family:${MONO};color:#111111;font-size:13px;font-weight:bold;letter-spacing:1px;padding-top:10px;">
      <a href="${pieceUrl(hero.slug, hero.id)}" style="color:#111111;text-decoration:underline;">${esc(hero.line)}</a>
    </td></tr>` : '';

  const stat = (v: string, l: string) => `
    <td width="33%" align="center" style="border:2px solid #111111;padding-top:12px;padding-bottom:12px;">
      <div style="font-family:${MONO};color:#111111;font-size:20px;font-weight:bold;line-height:24px;">${v}</div>
      <div style="font-family:${MONO};color:#111111;font-size:11px;font-weight:bold;letter-spacing:2px;line-height:16px;padding-top:2px;">${l}</div>
    </td>`;

  const ledgerRows = sales.slice(0, 10).map((s) => `
    <tr>
      ${cell(dayStamp(s.timestamp), 'font-size:12px;padding-top:7px;padding-bottom:7px;border-bottom:1px solid #111111;white-space:nowrap;')}
      ${cell(`<a href="${pieceUrl(s.project_id, s.token_id)}" style="color:#111111;font-weight:bold;text-decoration:underline;">${esc(pieceName(s.project_id, s.token_id))}</a>`, 'font-size:13px;padding-top:7px;padding-bottom:7px;border-bottom:1px solid #111111;padding-left:10px;')}
      ${cell(`◊${formatEth(s.price_eth)}`, 'font-size:13px;font-weight:bold;padding-top:7px;padding-bottom:7px;border-bottom:1px solid #111111;text-align:right;white-space:nowrap;')}
    </tr>`).join('');

  const freshRows = fresh.map((p) => {
    const def = getProject(p.id)!;
    return `<tr>${cell(
      `<a href="${SITE}/art/${p.id}" style="color:#111111;font-weight:bold;text-decoration:underline;">${esc(def.displayName)}</a>${def.artistHandle ? ` — by @${esc(def.artistHandle)}` : ''} · ${def.outputs} pieces`,
      'font-size:13px;padding-top:7px;padding-bottom:7px;border-bottom:1px solid #111111;',
    )}</tr>`;
  }).join('');

  const floorTable = floorRows.map((f) => `
    <tr>
      ${cell(`<a href="${SITE}/art/${f.slug}" style="color:#111111;font-weight:bold;text-decoration:underline;">${esc(f.name)}</a>`, 'font-size:13px;padding-top:7px;padding-bottom:7px;border-bottom:1px solid #111111;')}
      ${cell(`${f.minted}/${f.supply}`, 'font-size:12px;padding-top:7px;padding-bottom:7px;border-bottom:1px solid #111111;text-align:right;white-space:nowrap;padding-left:10px;')}
      ${cell(f.floor != null ? `floor ◊${formatEth(f.floor)}` : 'no floor yet', 'font-size:12px;font-weight:bold;padding-top:7px;padding-bottom:7px;border-bottom:1px solid #111111;text-align:right;white-space:nowrap;padding-left:10px;')}
    </tr>`).join('');

  const wallCells = wall.map((w) => {
    const thumb = artThumbUrl(w.project_id, Number(w.token_id));
    if (!thumb) return '';
    return `
      <td width="33%" align="center" style="padding-top:6px;padding-bottom:6px;padding-left:3px;padding-right:3px;">
        <a href="${pieceUrl(w.project_id, w.token_id)}">
          <img src="${thumb}" alt="${esc(pieceName(w.project_id, w.token_id))}" width="176" height="176" border="0" style="display:block;width:100%;max-width:176px;height:auto;border:1px solid #111111;" />
        </a>
      </td>`;
  });
  const wallRows = [wallCells.slice(0, 3), wallCells.slice(3, 6)]
    .filter((r) => r.length && r.some(Boolean))
    .map((r) => `<tr>${r.join('')}</tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff">
<tr><td align="center" style="padding-top:30px;padding-bottom:40px;padding-left:16px;padding-right:16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- Masthead — the paper's own voice -->
  <tr><td align="center" style="border-bottom:3px double #111111;padding-bottom:14px;">
    <div style="font-family:Inter, Arial, Helvetica, sans-serif;color:#111111;font-size:14px;font-weight:bold;letter-spacing:3px;line-height:18px;">&#8240; PRICE DISCUSSION</div>
    <div style="font-family:${MONO};color:#111111;font-size:27px;font-weight:bold;letter-spacing:4px;line-height:36px;padding-top:6px;">THE PD DISPATCH</div>
    <div style="font-family:${MONO};color:#111111;font-size:12px;font-weight:bold;letter-spacing:3px;line-height:18px;padding-top:4px;">DIGEST · ${label}</div>
  </td></tr>

  ${heroBlock}

  <!-- The pulse — three numbers, wide air -->
  <tr><td style="padding-top:26px;">
    <table width="100%" cellpadding="0" cellspacing="6" border="0"><tr>
      ${stat(`◊${formatEth(vol)}`, 'VOLUME')}
      ${stat(String(sales.length), sales.length === 1 ? 'SALE' : 'SALES')}
      ${stat(String(mints.length), mints.length === 1 ? 'MINT' : 'MINTS')}
    </tr></table>
  </td></tr>

  <tr><td align="center" style="padding-top:22px;">
    <a href="${SITE}" style="font-family:${MONO};color:#ffffff;background-color:#111111;font-size:14px;font-weight:bold;letter-spacing:2px;text-decoration:none;display:inline-block;padding-top:13px;padding-bottom:13px;padding-left:30px;padding-right:30px;">OPEN PRICE DISCUSSION</a>
  </td></tr>

  <!-- ── The dense half: the full record ── -->
  ${sales.length ? `${rule('EVERY SALE THAT MATTERED')}
  <tr><td style="padding-top:4px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${ledgerRows}</table>
  ${sales.length > 10 ? `<div style="font-family:${MONO};color:#111111;font-size:11px;font-weight:bold;padding-top:6px;">+ ${sales.length - 10} more on the tape</div>` : ''}
  </td></tr>` : ''}

  ${rule('NEW PROJECTS — THROUGH THE FILTER')}
  ${fresh.length ? `
  <tr><td style="font-family:${MONO};color:#111111;font-size:12px;line-height:18px;padding-top:6px;">Every project below cleared PD&#39;s artist filter this stretch — a quality floor every project passes, not a taste gate — and is minting now:</td></tr>
  <tr><td style="padding-top:4px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${freshRows}</table></td></tr>`
    : `<tr><td style="font-family:${MONO};color:#111111;font-size:13px;line-height:19px;padding-top:6px;">The filter — the quality floor every PD project must clear — held this stretch: nothing new came through.</td></tr>`}

  ${floorRows.length ? `${rule('ON THE FLOOR — WHERE THE ACTION WAS')}
  <tr><td style="padding-top:4px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${floorTable}</table></td></tr>` : ''}

  ${wallRows ? `${rule('THE GALLERY WALL — LATEST OFF THE PRESS')}
  <tr><td style="padding-top:8px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${wallRows}</table></td></tr>` : ''}

  <!-- Join the chat — the room where all of this gets argued about -->
  <tr><td align="center" style="padding-top:30px;">
    <a href="${DISCORD_URL}" style="font-family:${MONO};color:#ffffff;background-color:#111111;font-size:14px;font-weight:bold;letter-spacing:2px;text-decoration:none;display:inline-block;padding-top:13px;padding-bottom:13px;padding-left:30px;padding-right:30px;">JOIN THE CHAT — PD DISCORD</a>
  </td></tr>

  <!-- The Stamp — this edition's one-of-one generative mark -->
  <tr><td align="center" style="padding-top:28px;">${editionStamp(editionName)}</td></tr>
  <tr><td align="center" style="font-family:${MONO};color:#111111;font-size:11px;font-weight:bold;letter-spacing:2px;line-height:16px;padding-top:8px;">THE STAMP · EDITION ${label} · ONE OF ONE</td></tr>

  <!-- Colophon -->
  <tr><td align="center" style="border-top:3px double #111111;margin-top:30px;padding-top:16px;">
    <div style="font-family:${MONO};color:#111111;font-size:11px;font-weight:bold;letter-spacing:1px;line-height:17px;padding-top:14px;">
      ASSEMBLED BY THE PLATFORM ITSELF, STRAIGHT FROM THE LEDGER.<br>
      THREE EDITIONS A MONTH — THE 1ST · 11TH · 22ND.
    </div>
    <div style="font-family:${MONO};font-size:12px;line-height:18px;padding-top:12px;">
      <a href="${SITE}/dispatch" style="color:#111111;text-decoration:underline;font-weight:bold;">READ THE DAILY DISPATCH</a>
    </div>
    <div style="font-family:${MONO};font-size:12px;line-height:18px;padding-top:8px;padding-bottom:6px;">
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#111111;text-decoration:underline;font-weight:bold;">UNSUBSCRIBE — ONE TAP, INSTANT, NO QUESTIONS</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  /* ── Plain text mirror ─────────────────────────────────────────────── */
  const text = [
    `THE PD DISPATCH — DIGEST · ${label}`,
    '',
    hero ? `${hero.line} → ${pieceUrl(hero.slug, hero.id)}` : null,
    `VOLUME ◊${formatEth(vol)} · ${sales.length} sales · ${mints.length} mints`,
    '',
    sales.length ? 'EVERY SALE THAT MATTERED' : null,
    ...sales.slice(0, 10).map((s) => `  ${dayStamp(s.timestamp)} · ${pieceName(s.project_id, s.token_id)} · ◊${formatEth(s.price_eth)} → ${pieceUrl(s.project_id, s.token_id)}`),
    '',
    'NEW PROJECTS — THROUGH THE FILTER (cleared PD’s quality floor this stretch, minting now)',
    ...(fresh.length
      ? fresh.map((p) => `  ${getProject(p.id)!.displayName}${getProject(p.id)!.artistHandle ? ` by @${getProject(p.id)!.artistHandle}` : ''} → ${SITE}/art/${p.id}`)
      : ['  The filter held — nothing new came through this stretch.']),
    '',
    `Open Price Discussion → ${SITE}`,
    `Join the chat — PD Discord → ${DISCORD_URL}`,
    `Read the daily Dispatch → ${SITE}/dispatch`,
    `Unsubscribe (one tap, instant) → {{{RESEND_UNSUBSCRIBE_URL}}}`,
  ].filter((l): l is string => l != null).join('\n');

  return { subject, previewText, html, text, empty };
}
