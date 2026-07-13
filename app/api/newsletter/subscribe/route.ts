/*
 * POST /api/newsletter/subscribe — join the Dispatch Digest list.
 *
 * The list of record is Resend (contacts in the "Dispatch Digest" segment) —
 * no PD database writes. The free plan sends 3,000 emails/month and the
 * digest prints 3×/month, so the list is CAPPED at 1,000 subscribers; at the
 * cap we say so honestly instead of silently over-subscribing past the
 * plan (Brendon, 2026-07-13).
 *
 * Needs RESEND_API_KEY (Worker secret). Missing key → 503, honest copy.
 */

import { NextResponse } from 'next/server';
import { badRequest } from '@/lib/errors';
import { DIGEST_SEGMENT_ID } from '@/lib/newsletter/digest.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CAP = 1000;
const API = 'https://api.resend.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request): Promise<Response> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'The Digest press is not wired up yet — try again soon.' },
      { status: 503 },
    );
  }

  let email = '';
  try {
    const body = (await req.json()) as { email?: string };
    email = String(body.email ?? '').trim().toLowerCase();
  } catch {
    return badRequest('Bad body');
  }
  if (!EMAIL_RE.test(email) || email.length > 254) return badRequest('That does not read as an email address');

  const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    // Cap check — count the segment (paginated; the cap keeps this small).
    let count = 0;
    let after: string | null = null;
    for (let page = 0; page < 12; page++) {
      const qs = new URLSearchParams({ limit: '100', segment_id: DIGEST_SEGMENT_ID });
      if (after) qs.set('after', after);
      const r = await fetch(`${API}/contacts?${qs}`, { headers: auth });
      if (!r.ok) break; // cap check is best-effort — never block a subscribe on it
      const j = (await r.json()) as { data?: { id: string }[]; has_more?: boolean };
      const rows = j.data ?? [];
      count += rows.length;
      if (!j.has_more || rows.length === 0) break;
      after = rows[rows.length - 1].id;
    }
    if (count >= CAP) {
      return NextResponse.json(
        { ok: false, error: 'The print run is full — 1,000 readers. Seats open as they free up.' },
        { status: 409 },
      );
    }

    const create = await fetch(`${API}/contacts`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ email, segments: [{ id: DIGEST_SEGMENT_ID }] }),
    });
    if (create.ok) return NextResponse.json({ ok: true, state: 'subscribed' });

    // Already a contact → make sure the digest segment is on them.
    if (create.status === 409 || create.status === 422) {
      const patch = await fetch(`${API}/contacts/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({ unsubscribed: false, segments: [{ id: DIGEST_SEGMENT_ID }] }),
      });
      if (patch.ok) return NextResponse.json({ ok: true, state: 'already' });
    }
    const detail = await create.text().catch(() => '');
    return NextResponse.json(
      { ok: false, error: 'The press jammed — try again in a minute.', detail: detail.slice(0, 200) },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'The press jammed — try again in a minute.' },
      { status: 502 },
    );
  }
}
