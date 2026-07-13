// lib/telemetry/server.ts — server-only error sink (Architect Report §3.3).
//
// One job: make production faults VISIBLE. Every 500 the API returns and
// every client-beacon report lands in public.app_errors, de-duplicated by
// fingerprint (same fault = one row with a climbing count). Strictly
// best-effort and fire-and-forget: telemetry must never slow or break the
// request that's already failing. Table is service-role-only (RLS on, zero
// policies) — nothing here is readable or writable by clients.

import { getSupabaseService } from '@/lib/supabase';
import { errorFingerprint } from './fingerprint';

const MAX_MESSAGE = 500;
const MAX_STACK = 800;
const RETENTION_DAYS = 30;
const ROW_CAP = 5000;
/** Fraction of writes that also run the prune (keeps the table bounded with
 *  zero cron dependency). */
const PRUNE_SAMPLE = 0.02;

export interface ErrorReport {
  kind: 'client' | 'server';
  route?: string | null;
  message: string;
  stackHead?: string | null;
  buildId?: string | null;
  ua?: string | null;
  address?: string | null;
}

export async function recordError(report: ErrorReport): Promise<void> {
  try {
    const db = getSupabaseService();
    const message = report.message.slice(0, MAX_MESSAGE);
    const fingerprint = errorFingerprint(report.kind, report.route ?? null, message);

    // Insert first (the common case for a new fault); on the unique-violation
    // race or repeat, bump the counter instead.
    const { error } = await (db.from('app_errors' as never) as never as {
      insert(v: Record<string, unknown>): PromiseLike<{ error: { code?: string } | null }>;
    }).insert({
      kind: report.kind,
      route: report.route ?? null,
      message,
      stack_head: report.stackHead?.slice(0, MAX_STACK) ?? null,
      build_id: report.buildId ?? null,
      ua: report.ua?.slice(0, 200) ?? null,
      address: report.address ?? null,
      fingerprint,
    });

    if (error) {
      // 23505 = duplicate fingerprint → bump count + freshness.
      await db.rpc('app_bump_error' as never, { p_fingerprint: fingerprint } as never);
    }

    if (Math.random() < PRUNE_SAMPLE) {
      await db.rpc('app_prune_errors' as never, {
        p_keep_days: RETENTION_DAYS,
        p_row_cap: ROW_CAP,
      } as never);
    }
  } catch {
    // Telemetry never throws into the caller.
  }
}

/** Convenience for the API error envelope: record + return nothing. Callers
 *  must not await in the hot path — void it. */
export function recordServerError(detail: unknown, route?: string | null): void {
  const message =
    detail instanceof Error ? detail.message : typeof detail === 'string' ? detail : JSON.stringify(detail ?? 'unknown');
  const stackHead = detail instanceof Error ? (detail.stack ?? '').split('\n').slice(0, 6).join('\n') : null;
  void recordError({ kind: 'server', route: route ?? null, message, stackHead });
}
