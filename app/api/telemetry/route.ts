/*
 * POST /api/telemetry — the client-side error beacon (Architect Report §3.3).
 *
 * Receives { message, stackHead?, route?, buildId? } from the global error
 * hooks (lib/telemetry/client.ts) and CSP violation reports (the report-only
 * policy in next.config points here). No auth on purpose — crashes happen to
 * signed-out visitors too — but strictly bounded: hard size caps, fingerprint
 * de-dupe in the sink, sampled prune, and the normal per-IP middleware rate
 * bucket in front. Never returns error detail; there is nothing to leak.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { recordError } from '@/lib/telemetry/server';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4_096;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = await req.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return NextResponse.json({ ok: true });

    let message = '';
    let stackHead: string | null = null;
    let route: string | null = null;
    let buildId: string | null = null;

    try {
      const body = JSON.parse(raw) as Record<string, unknown>;
      if (body && typeof body === 'object' && 'csp-report' in body) {
        // Browser-native CSP report payload.
        const r = body['csp-report'] as Record<string, unknown>;
        message = `CSP: ${String(r['violated-directive'] ?? 'violation')} blocked ${String(r['blocked-uri'] ?? '?')}`;
        route = typeof r['document-uri'] === 'string' ? new URL(r['document-uri']).pathname : null;
      } else {
        message = typeof body.message === 'string' ? body.message : '';
        stackHead = typeof body.stackHead === 'string' ? body.stackHead : null;
        route = typeof body.route === 'string' ? body.route : null;
        buildId = typeof body.buildId === 'string' ? body.buildId : null;
      }
    } catch {
      return NextResponse.json({ ok: true });
    }

    if (message) {
      await recordError({
        kind: 'client',
        route,
        message,
        stackHead,
        buildId,
        ua: req.headers.get('user-agent'),
      });
    }
  } catch {
    // Beacons never error out loud.
  }
  return NextResponse.json({ ok: true });
}
