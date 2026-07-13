/*
 * The Dispatch DIGEST press run. Rides the 1-min Cron Trigger exactly like
 * the daily Dispatch: on the 1st, 11th and 21st (Montreal), once the clock
 * passes 9AM, build the digest from the ledger and hand it to Resend as a
 * broadcast (create + send in one call). Idempotent WITHOUT a database:
 * each edition carries a deterministic name (pd-digest-YYYY-MM-DD) and the
 * run first asks Resend whether that edition already exists.
 *
 * Cheap: every non-edition-day run exits on pure clock math; edition-day
 * runs before 9AM exit the same way; after the send, the name probe exits.
 */

import { getSupabaseService } from '@/lib/supabase';
import { getPreviewBucket } from '@/lib/cf/r2';
import { ART_REV } from '@/lib/project/registry';
import { buildDigest, montrealYMD, DIGEST_DAYS, DIGEST_SEGMENT_ID } from '@/lib/newsletter/digest.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API = 'https://api.resend.com';
const FROM = 'The PD Dispatch <dispatch@pricediscussion.com>';

function montrealHour(): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Montreal', hour: 'numeric', hourCycle: 'h23' })
      .format(new Date()),
  );
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('forbidden', { status: 403 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ ok: true, waiting: 'no RESEND_API_KEY on the worker' });

  try {
    const { y, m, d } = montrealYMD(new Date());
    if (!(DIGEST_DAYS as readonly number[]).includes(d)) return Response.json({ ok: true, notToday: true });
    if (montrealHour() < 9) return Response.json({ ok: true, waiting: true });

    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const editionName = `pd-digest-${iso}`;
    const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

    // Already printed? (name probe over the most recent broadcasts)
    const listed = await fetch(`${API}/broadcasts?limit=20`, { headers: auth });
    if (listed.ok) {
      const j = (await listed.json()) as { data?: { name?: string | null }[] };
      if ((j.data ?? []).some((b) => b.name === editionName)) {
        return Response.json({ ok: true, printed: false, already: true });
      }
    }

    // Anyone reading? An empty room skips the run (and the ledger probe).
    const seg = await fetch(`${API}/contacts?limit=1&segment_id=${DIGEST_SEGMENT_ID}`, { headers: auth });
    if (seg.ok) {
      const j = (await seg.json()) as { data?: unknown[] };
      if ((j.data ?? []).length === 0) return Response.json({ ok: true, skipped: 'no subscribers yet' });
    }

    // R2 head-probe: only pieces with a stored preview get printed (the
    // Worker can't fetch its own public URL — error 1042 — but it holds the
    // bucket binding, so we ask R2 directly).
    const bucket = getPreviewBucket();
    const hasArt = bucket
      ? async (slug: string, tokenId: number) => (await bucket.head(`${slug}/${tokenId}.${ART_REV}.png`)) != null
      : undefined;

    const digest = await buildDigest(getSupabaseService(), y, m, d, hasArt);
    if (digest.empty) return Response.json({ ok: true, skipped: 'ledger empty this window' });

    const send = await fetch(`${API}/broadcasts`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        name: editionName,
        segment_id: DIGEST_SEGMENT_ID,
        from: FROM,
        subject: digest.subject,
        preview_text: digest.previewText,
        html: digest.html,
        text: digest.text,
        send: true,
      }),
    });
    if (!send.ok) {
      const detail = await send.text().catch(() => '');
      throw new Error(`resend ${send.status}: ${detail.slice(0, 300)}`);
    }
    return Response.json({ ok: true, printed: true, edition: editionName });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
