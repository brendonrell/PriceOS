/*
 * lib/replay/history.ts — seeded market-history generator for The Replay ⟳.
 *
 * Until the indexer is live there is no real per-Project time series, so this
 * builds a DETERMINISTIC, believable history from a Project's identity + its
 * current end-state numbers. Same Project → same history every time (seeded
 * from the slug), and the FINAL snapshot is pinned to the live numbers the
 * rest of the page already shows (floor / holders / listings / volume) so the
 * Replay always lands exactly on "today".
 *
 * Swap-in note: when the indexer ships, replace buildReplayHistory's body with
 * a fetch of real timestamped events → the player consumes the same shapes
 * (ReplaySnapshot / ReplayEvent) untouched.
 */

export interface ReplaySnapshot {
  /** Unix ms for this day. */
  t: number;
  /** Floor price in ETH at this point. */
  floor: number;
  /** Unique holders at this point. */
  holders: number;
  /** Outputs listed for sale at this point. */
  listings: number;
  /** Cumulative sales count up to this point. */
  sales: number;
  /** Cumulative secondary volume (ETH) up to this point. */
  volume: number;
}

export type ReplayEventKind = 'mint' | 'firstSale' | 'whale' | 'ath' | 'quiet' | 'support' | 'sale';

export interface ReplayEvent {
  /** Unix ms for the moment. */
  t: number;
  /** Position along the timeline, 0..1. */
  f: number;
  kind: ReplayEventKind;
  /** Short ALLCAPS headline shown when the playhead lands on it. */
  label: string;
  /** Sale price for sale/ath markers (ETH), when relevant. */
  price?: number;
  /** True for the handful of narrated milestones (drives the caption line). */
  milestone: boolean;
}

export interface ReplayEndState {
  floor: number;
  holders: number;
  listings: number;
  volume: number;
  /** Total minted (for seeding scale + the mint event). */
  minted: number;
  /** Project mint price (ETH) — the curve's starting floor. */
  mintPrice: number;
}

export interface ReplayHistory {
  startMs: number;
  endMs: number;
  /** One snapshot per day, oldest → newest. Last === end-state. */
  snapshots: ReplaySnapshot[];
  /** Discrete moments along the timeline. */
  events: ReplayEvent[];
  /** Peak floor reached + the day index it happened. */
  athFloor: number;
}

const DAY_MS = 86_400_000;

/* Deterministic string hash → 32-bit seed. */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/* mulberry32 — small, fast, stable PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* A smooth 0..1 ease used to shape the floor arc segments. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Build a Project's full seeded history. Deterministic from `slug`; the final
 * snapshot is pinned to `end`. Span (in days) is itself seeded so different
 * Projects feel different ages, clamped to a readable 70–340 day window.
 */
export function buildReplayHistory(slug: string, end: ReplayEndState, nowMs = Date.now()): ReplayHistory {
  const rnd = mulberry32(hashSeed(slug || 'pd'));

  const days = Math.round(lerp(70, 340, rnd()));
  const startMs = nowMs - days * DAY_MS;

  const finalFloor = end.floor > 0 ? end.floor : Math.max(0.01, end.mintPrice || 0.02);
  const finalHolders = end.holders > 0 ? end.holders : Math.max(8, Math.round((end.minted || 100) * 0.34));
  const finalListings = end.listings > 0 ? end.listings : Math.max(2, Math.round((end.minted || 100) * 0.12));
  const finalVolume = end.volume > 0 ? end.volume : finalFloor * finalHolders * lerp(1.2, 3.0, rnd());
  const mintFloor = Math.max(0.005, end.mintPrice > 0 ? end.mintPrice : finalFloor * lerp(0.35, 0.7, rnd()));

  /* Floor arc control points (fraction-of-timeline → multiplier of finalFloor),
     shaping the classic life: mint → ignored dip → discovery → ATH → crash →
     settle. All seeded so each Project's biography differs. */
  const dipF = lerp(0.08, 0.22, rnd());          // the quiet early dip
  const discoverF = lerp(0.3, 0.5, rnd());        // discovery begins
  const athF = lerp(0.52, 0.72, rnd());           // peak
  const athMult = lerp(1.7, 3.4, rnd());          // peak height vs final
  const dipMult = lerp(0.55, 0.85, rnd());        // how deep the early dip went
  const supportF = lerp(0.78, 0.9, rnd());        // where it found support
  const athFloorVal = finalFloor * athMult;

  function floorAt(f: number): number {
    let base: number;
    if (f <= dipF) {
      base = lerp(mintFloor, finalFloor * dipMult, smooth(f / dipF));
    } else if (f <= discoverF) {
      base = lerp(finalFloor * dipMult, finalFloor * lerp(1.0, 1.3, 0.5), smooth((f - dipF) / (discoverF - dipF)));
    } else if (f <= athF) {
      base = lerp(finalFloor * 1.15, athFloorVal, smooth((f - discoverF) / (athF - discoverF)));
    } else if (f <= supportF) {
      base = lerp(athFloorVal, finalFloor * 1.06, smooth((f - athF) / (supportF - athF)));
    } else {
      base = lerp(finalFloor * 1.06, finalFloor, smooth((f - supportF) / (1 - supportF)));
    }
    return base;
  }

  const snapshots: ReplaySnapshot[] = [];
  for (let i = 0; i <= days; i++) {
    const f = days === 0 ? 1 : i / days;
    const t = startMs + i * DAY_MS;

    // Floor: shaped arc + small seeded daily jitter (none on the last day so
    // the end pins exactly to the live floor).
    const jitter = i === days ? 1 : lerp(0.94, 1.06, rnd());
    const floor = Math.max(0.001, floorAt(f) * jitter);

    // Holders: monotonic, fast early growth easing into the final count.
    const holders = i === days
      ? finalHolders
      : Math.round(lerp(Math.max(1, Math.round(finalHolders * 0.04)), finalHolders, Math.pow(f, 0.62)));

    // Listings: oscillate with float price — more listed near peaks.
    const listFrac = 0.5 + 0.32 * Math.sin(f * Math.PI * lerp(2, 4, 0.5)) * (0.6 + 0.4 * f);
    const listings = i === days
      ? finalListings
      : Math.max(1, Math.round(finalListings * Math.max(0.25, listFrac)));

    // Cumulative sales + volume: rise with activity, weighted toward the
    // discovery→peak window.
    const activity = Math.pow(f, 0.8);
    const sales = i === days
      ? Math.max(end.minted ? Math.round(end.minted * 0.9) : finalHolders * 3, finalHolders)
      : Math.round(lerp(0, Math.max(finalHolders * 3, (end.minted || 100) * 0.9), activity));
    const volume = i === days ? finalVolume : Math.round(finalVolume * activity * 100) / 100;

    snapshots.push({ t, floor, holders, listings, sales, volume });
  }

  // Events along the timeline — a few narrated milestones + scattered sales.
  const events: ReplayEvent[] = [];
  const fToT = (f: number) => startMs + Math.round(f * days) * DAY_MS;

  events.push({ t: startMs, f: 0, kind: 'mint', label: end.minted ? `MINTED · ${end.minted} OUTPUTS` : 'MINT', milestone: true });

  const firstSaleF = lerp(dipF * 0.5, dipF, rnd());
  events.push({ t: fToT(firstSaleF), f: firstSaleF, kind: 'firstSale', label: 'FIRST BLOOD', price: floorAt(firstSaleF), milestone: true });

  const whaleF = lerp(discoverF, athF - 0.04, rnd());
  events.push({ t: fToT(whaleF), f: whaleF, kind: 'whale', label: 'A WHALE ENTERED', milestone: true });

  events.push({ t: fToT(athF), f: athF, kind: 'ath', label: `ALL-TIME HIGH · ${athFloorVal.toFixed(2)} ETH`, price: athFloorVal, milestone: true });

  const quietF = lerp(athF + 0.05, supportF - 0.02, rnd());
  events.push({ t: fToT(quietF), f: quietF, kind: 'quiet', label: 'THE QUIET WEEKS', milestone: true });

  events.push({ t: fToT(supportF), f: supportF, kind: 'support', label: 'FLOOR FOUND SUPPORT', price: floorAt(supportF), milestone: true });

  // Scattered (non-milestone) sale dots for texture.
  const saleCount = 7 + Math.floor(rnd() * 7);
  for (let i = 0; i < saleCount; i++) {
    const f = rnd();
    events.push({ t: fToT(f), f, kind: 'sale', label: 'SALE', price: floorAt(f) * lerp(0.95, 1.25, rnd()), milestone: false });
  }

  events.sort((a, b) => a.f - b.f);

  return { startMs, endMs: snapshots[snapshots.length - 1].t, snapshots, events, athFloor: athFloorVal };
}

/** Linear-interpolate a snapshot at any fractional position 0..1. */
export function snapshotAt(history: ReplayHistory, f: number): ReplaySnapshot {
  const snaps = history.snapshots;
  if (snaps.length === 1) return snaps[0];
  const clamped = Math.max(0, Math.min(1, f));
  const pos = clamped * (snaps.length - 1);
  const i = Math.floor(pos);
  const frac = pos - i;
  const a = snaps[i];
  const b = snaps[Math.min(snaps.length - 1, i + 1)];
  return {
    t: lerp(a.t, b.t, frac),
    floor: lerp(a.floor, b.floor, frac),
    holders: Math.round(lerp(a.holders, b.holders, frac)),
    listings: Math.round(lerp(a.listings, b.listings, frac)),
    sales: Math.round(lerp(a.sales, b.sales, frac)),
    volume: lerp(a.volume, b.volume, frac),
  };
}

/* ════════════════════════════════════════════════════════════════════════
   THE REAL THING — history from the actual ledger (Brendon, 2026-07-05:
   "I love it, just make it real"). Same output shapes; the player is
   untouched. The seeded builder above stays ONLY as the fallback for a
   project whose ledger is still empty.
   ════════════════════════════════════════════════════════════════════════ */

/** One raw ledger row, as /api/project/[slug]/replay serves it. */
export interface LedgerEventRow {
  type: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: number | string | null;
  /** Unix SECONDS (the events table convention). */
  timestamp: number | string;
}

interface WalkEvent {
  t: number; // ms
  type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
  token: string | null;
  from: string | null;
  to: string | null;
  price: number | null;
}

function normalizeRow(r: LedgerEventRow): WalkEvent | null {
  const sec = Number(r.timestamp);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  const price = r.price_eth != null && Number(r.price_eth) > 0 ? Number(r.price_eth) : null;
  let type: WalkEvent['type'];
  if (r.type === 'MINT') type = 'MINT';
  else if (r.type === 'LIST') type = 'LIST';
  else if (r.type === 'XFER') type = price != null ? 'SALE' : 'XFER';
  else return null;
  return { t: sec * 1000, type, token: r.token_id, from: r.from_address, to: r.to_address, price };
}

/**
 * Build a Project's REAL history by replaying its ledger. Every number is
 * derived: holders from the ownership walk (MINT/XFER move tokens between
 * wallets), the floor from the active-listing set (LIST adds, a token's
 * sale/transfer clears its listing — delistings aren't evented, the one
 * honest approximation), sales + volume from priced transfers. Returns null
 * when the ledger is empty (caller falls back to the seeded biography).
 */
export function buildReplayHistoryFromLedger(
  rows: LedgerEventRow[],
  opts: { uploadedAtMs?: number | null; maxSupply?: number | null; nowMs?: number } = {},
): ReplayHistory | null {
  const evs = rows.map(normalizeRow).filter((e): e is WalkEvent => !!e).sort((a, b) => a.t - b.t);
  if (evs.length === 0) return null;

  const nowMs = opts.nowMs ?? Date.now();
  const startMs = Math.min(
    evs[0].t,
    opts.uploadedAtMs != null && Number.isFinite(opts.uploadedAtMs) ? opts.uploadedAtMs : evs[0].t,
  );
  const endMs = Math.max(nowMs, evs[evs.length - 1].t);
  if (endMs <= startMs) return null;
  const span = endMs - startMs;

  // ── The walk ────────────────────────────────────────────────────────────
  const ownerOf = new Map<string, string>();      // token → wallet
  const holdings = new Map<string, number>();     // wallet → token count
  const listed = new Map<string, number>();       // token → asking price
  let holders = 0;
  let salesCount = 0;
  let volume = 0;
  let floor = 0;

  const gain = (addr: string | null) => {
    if (!addr) return;
    const a = addr.toLowerCase();
    const n = (holdings.get(a) ?? 0) + 1;
    holdings.set(a, n);
    if (n === 1) holders++;
  };
  const lose = (addr: string | null) => {
    if (!addr) return;
    const a = addr.toLowerCase();
    const n = (holdings.get(a) ?? 0) - 1;
    if (n <= 0) { if (holdings.has(a)) holders--; holdings.delete(a); }
    else holdings.set(a, n);
  };
  const recomputeFloor = () => {
    floor = 0;
    listed.forEach((p) => { if (floor === 0 || p < floor) floor = p; });
  };

  const SAMPLES = 240;
  const snapshots: ReplaySnapshot[] = [];
  const events: ReplayEvent[] = [];
  const push = (t: number, kind: ReplayEventKind, label: string, milestone: boolean, price?: number) => {
    events.push({ t, f: (t - startMs) / span, kind, label, milestone, ...(price != null ? { price } : {}) });
  };

  let mintCount = 0;
  let athSale: { t: number; price: number } | null = null;
  let firstTradeDone = false;
  let athFloor = 0;
  const saleDots: { t: number; price: number }[] = [];

  let ei = 0;
  let lastEventT = startMs;
  let quiet: { t: number; gap: number } | null = null;

  for (let s = 0; s <= SAMPLES; s++) {
    const sampleT = startMs + (span * s) / SAMPLES;
    while (ei < evs.length && evs[ei].t <= sampleT) {
      const e = evs[ei++];
      const gap = e.t - lastEventT;
      if (gap > (quiet?.gap ?? 0)) quiet = { t: lastEventT + gap / 2, gap };
      lastEventT = e.t;
      if (e.type === 'MINT') {
        gain(e.to);
        if (e.token) ownerOf.set(e.token, (e.to ?? '').toLowerCase());
        mintCount++;
        if (mintCount === 1) push(e.t, 'mint', 'FIRST BLOOD', true, e.price ?? undefined);
        else if (mintCount === 18) push(e.t, 'mint', 'GRADUATED · NOW MINTING', true);
        else if (mintCount === 22) push(e.t, 'mint', 'LUCKY 22', true);
        else if (mintCount === 100) push(e.t, 'mint', 'CENTURY CLUB', true);
        if (opts.maxSupply && mintCount === opts.maxSupply) push(e.t, 'mint', `SOLD OUT · ${mintCount}`, true);
      } else if (e.type === 'LIST') {
        if (e.token && e.price != null) { listed.set(e.token, e.price); recomputeFloor(); }
      } else { // SALE / XFER — the token changes hands; its listing clears.
        if (e.token) {
          const prev = ownerOf.get(e.token);
          lose(e.from ?? prev ?? null);
          gain(e.to);
          ownerOf.set(e.token, (e.to ?? '').toLowerCase());
          if (listed.delete(e.token)) recomputeFloor();
        }
        if (e.type === 'SALE' && e.price != null) {
          salesCount++;
          volume += e.price;
          saleDots.push({ t: e.t, price: e.price });
          if (!firstTradeDone) { firstTradeDone = true; push(e.t, 'firstSale', `FIRST TRADE · ${e.price.toFixed(3)} ETH`, true, e.price); }
          if (!athSale || e.price > athSale.price) athSale = { t: e.t, price: e.price };
        }
      }
    }
    if (floor > athFloor) athFloor = floor;
    snapshots.push({
      t: sampleT,
      floor,
      holders,
      listings: listed.size,
      sales: salesCount,
      volume: Math.round(volume * 1000) / 1000,
    });
  }

  // Narrated moments derived after the walk.
  push(startMs, 'mint', opts.uploadedAtMs != null ? 'GENESIS' : 'THE RECORD BEGINS', true);
  if (athSale && salesCount > 1) push(athSale.t, 'ath', `ALL-TIME HIGH · ${athSale.price.toFixed(3)} ETH`, true, athSale.price);
  if (quiet && quiet.gap >= 14 * DAY_MS && quiet.gap >= span * 0.2) push(quiet.t, 'quiet', 'THE QUIET WEEKS', true);

  // Sale dots for texture — cap so a busy ledger doesn't carpet the chart.
  const step = Math.max(1, Math.ceil(saleDots.length / 48));
  for (let i = 0; i < saleDots.length; i += step) {
    const d = saleDots[i];
    push(d.t, 'sale', 'SALE', false, d.price);
  }

  events.sort((a, b) => a.f - b.f);
  return { startMs, endMs, snapshots, events, athFloor: Math.max(athFloor, floor) };
}
