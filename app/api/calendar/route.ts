// /api/calendar — THE CALENDAR, real. One month read composes four layers:
//   1. GLOBAL items — @brendon-authored platform schedule (calendar_items).
//   2. PERSONAL items — the + beside the day note (SIWE-scoped).
//   3. AUTO milestones — project lifecycle straight off the ledger
//      (arrived ✧ · graduated ⟢⟢ · sold out ▲, the home-feed glyph set).
//   4. AUTO retrospectives — busy minting periods noted after they cool
//      (posthumous, never live), + a month story line on closed months:
//      the pseudo price story of the month.
// PriceDay talks to the calendar through the same Montreal day spine.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth, verifySiweSession } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { montrealMidnightUtcMs } from '@/lib/priceday/almanac.server';

export const dynamic = 'force-dynamic';

const VS15 = '︎';
const DAY_MS = 86_400_000;
const BUSY_MINTS = 8; // a day this hot earns a retrospective note

/** Per-item reminder plan (2026-07-16 Calendar Sheet — calendar↔pings fine
 *  control). 'attime' is the legacy behaviour every old row keeps. */
export type CalRemind = 'off' | 'attime' | '15m' | '1h' | '1d';
const REMINDS: readonly CalRemind[] = ['off', 'attime', '15m', '1h', '1d'];

interface CalItem {
  id?: string;
  scope: 'personal' | 'global' | 'auto';
  time?: string | null;
  title: string;
  mine?: boolean;
  remind?: CalRemind;
}

function montrealTodayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function keyFromMs(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms));
}

async function isBrendon(db: ReturnType<typeof getSupabaseService>, address: string): Promise<boolean> {
  const r = await db.from('users').select('handle').ilike('address', address).maybeSingle();
  return ((r.data as { handle?: string | null } | null)?.handle ?? '').toLowerCase() === 'brendon';
}

// ── GET ?year=2026&month=7 (1-based) ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get('year'));
  const month = Number(url.searchParams.get('month'));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest('Bad month');
  }
  try {
    const db = getSupabaseService();
    const viewer = await verifySiweSession(req);
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const todayKey = montrealTodayKey();

    // Window in UTC seconds covering the Montreal month (for event tallies).
    const calStart = Date.UTC(year, month - 1, 1);
    const calEnd = Date.UTC(year, month, 1);
    const startSec = Math.floor(montrealMidnightUtcMs(calStart) / 1000);
    const endSec = Math.floor(montrealMidnightUtcMs(calEnd) / 1000);

    const [storedRes, projRes, mintRes, saleRes] = await Promise.all([
      db.from('calendar_items')
        .select('id, scope, owner_address, date_key, time_label, title, remind')
        .like('date_key', `${monthPrefix}%`)
        .order('created_at', { ascending: true })
        .limit(300),
      db.from('projects').select('id, title, uploaded_at, graduated_at, sold_out_at').limit(2000),
      db.from('events').select('timestamp')
        .eq('type', 'MINT').gte('timestamp', startSec).lt('timestamp', endSec)
        .limit(5000),
      db.from('events').select('price_eth, timestamp')
        .eq('type', 'XFER').not('price_eth', 'is', null)
        .gte('timestamp', startSec).lt('timestamp', endSec)
        .limit(2000),
    ]);
    if (storedRes.error) return serverError(storedRes.error.message);

    const days: Record<string, CalItem[]> = {};
    const push = (key: string, item: CalItem) => {
      if (!key.startsWith(monthPrefix)) return;
      (days[key] ??= []).push(item);
    };

    // 1+2. Stored items (global for everyone; personal only for the viewer).
    for (const r of (storedRes.data ?? []) as { id: string; scope: string; owner_address: string | null; date_key: string; time_label: string | null; title: string; remind: string | null }[]) {
      if (r.scope === 'personal' && (!viewer || r.owner_address?.toLowerCase() !== viewer)) continue;
      push(r.date_key, {
        id: r.id,
        scope: r.scope as 'personal' | 'global',
        time: r.time_label,
        title: r.title,
        mine: r.scope === 'personal' || (r.scope === 'global' && !!viewer && r.owner_address?.toLowerCase() === viewer),
        remind: (REMINDS.includes((r.remind ?? '') as CalRemind) ? r.remind : 'attime') as CalRemind,
      });
    }

    // 3. Project milestones — the ledger populates the global calendar.
    for (const p of (projRes.data ?? []) as { id: string; title: string; uploaded_at: string | null; graduated_at: string | null; sold_out_at: string | null }[]) {
      if (!getProject(p.id)) continue;
      const stamp = (iso: string | null, title: string) => {
        if (!iso) return;
        const ms = Date.parse(iso);
        if (!Number.isFinite(ms)) return;
        push(keyFromMs(ms), { scope: 'auto', title });
      };
      stamp(p.uploaded_at, `✧${VS15} ${p.title} arrived`);
      stamp(p.graduated_at, `⟢⟢${VS15} ${p.title} graduated`);
      stamp(p.sold_out_at, `▲${VS15} ${p.title} sold out`);
    }

    // 4a. Busy-minting retrospectives — noted only AFTER the day has passed.
    const mintsByKey: Record<string, number> = {};
    for (const e of (mintRes.data ?? []) as { timestamp: number }[]) {
      const k = keyFromMs(e.timestamp * 1000);
      mintsByKey[k] = (mintsByKey[k] ?? 0) + 1;
    }
    for (const [k, count] of Object.entries(mintsByKey)) {
      if (count >= BUSY_MINTS && k < todayKey) {
        push(k, { scope: 'auto', title: `✶${VS15} Busy minting — ${count} pieces claimed` });
      }
    }

    // 4b. The month's pseudo price story — pinned to the last day of CLOSED
    //     months only (a month gets its line once it's history).
    const monthClosed = `${monthPrefix}-31` < todayKey || !todayKey.startsWith(monthPrefix) && monthPrefix < todayKey.slice(0, 7);
    if (monthClosed) {
      const sales = (saleRes.data ?? []) as { price_eth: number }[];
      const mintsTotal = Object.values(mintsByKey).reduce((a, b) => a + b, 0);
      const vol = sales.reduce((s, e) => s + Number(e.price_eth), 0);
      if (mintsTotal > 0 || sales.length > 0) {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        push(`${monthPrefix}-${String(lastDay).padStart(2, '0')}`, {
          scope: 'auto',
          title: `◷${VS15} The month: ${mintsTotal} mint${mintsTotal === 1 ? '' : 's'}${sales.length > 0 ? ` · ${sales.length} sale${sales.length === 1 ? '' : 's'} · ${Number(vol.toFixed(3))} ETH traded` : ''}`,
        });
      }
    }

    return NextResponse.json({
      month: monthPrefix,
      days,
      can_global: viewer ? await isBrendon(db, viewer) : false,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

// ── POST — add / update / delete items ───────────────────────────────────────
interface Body {
  action: 'add' | 'update' | 'delete';
  dateKey?: string;
  time?: string;
  title?: string;
  scope?: 'personal' | 'global';
  id?: string;
  remind?: string;
}

const cleanRemind = (v: unknown): CalRemind =>
  (REMINDS.includes(v as CalRemind) ? (v as CalRemind) : 'attime');

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest('Invalid JSON body');
  }
  try {
    const db = getSupabaseService();
    if (body.action === 'add') {
      const dateKey = body.dateKey ?? '';
      const title = (body.title ?? '').trim();
      const scope = body.scope === 'global' ? 'global' : 'personal';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return badRequest('Bad date');
      if (!title || title.length > 200) return badRequest('Bad title');
      if (scope === 'global' && !(await isBrendon(db, address))) {
        return badRequest('Global entries are the platform\'s to write');
      }
      const r = await db.from('calendar_items').insert({
        scope,
        owner_address: address,
        date_key: dateKey,
        time_label: (body.time ?? '').trim().slice(0, 24) || null,
        title,
        remind: cleanRemind(body.remind),
      } as never).select('id').single();
      if (r.error) return serverError(r.error.message);
      return NextResponse.json({ ok: true, id: (r.data as { id: string }).id });
    }
    if (body.action === 'update') {
      // The Calendar Sheet's edit path (2026-07-16) — own items only (or a
      // global item under the same authorship rule as delete).
      if (!body.id) return badRequest('Missing id');
      const r = await db.from('calendar_items').select('owner_address, scope').eq('id', body.id).maybeSingle();
      const row = r.data as { owner_address?: string | null; scope?: string } | null;
      if (!row) return badRequest('Not found');
      const ownsIt = row.owner_address?.toLowerCase() === address;
      if (!ownsIt && !(row.scope === 'global' && (await isBrendon(db, address)))) {
        return badRequest('Not yours to edit');
      }
      const title = (body.title ?? '').trim();
      if (!title || title.length > 200) return badRequest('Bad title');
      const u = await db.from('calendar_items').update({
        title,
        time_label: (body.time ?? '').trim().slice(0, 24) || null,
        remind: cleanRemind(body.remind),
      } as never).eq('id', body.id);
      if (u.error) return serverError(u.error.message);
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'delete') {
      if (!body.id) return badRequest('Missing id');
      const r = await db.from('calendar_items').select('owner_address, scope').eq('id', body.id).maybeSingle();
      const row = r.data as { owner_address?: string | null; scope?: string } | null;
      if (!row) return badRequest('Not found');
      const ownsIt = row.owner_address?.toLowerCase() === address;
      if (!ownsIt && !(row.scope === 'global' && (await isBrendon(db, address)))) {
        return badRequest('Not yours to remove');
      }
      await db.from('calendar_items').delete().eq('id', body.id);
      return NextResponse.json({ ok: true });
    }
    return badRequest('Unknown action');
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
