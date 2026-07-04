// POST /api/preview/[slug]/[id] — the Arweave preview WRITER, simulated.
//
// Mirrors the real on-chain flow (pd-contracts): after a mint, the piece's
// deterministic preview.png is pinned once and permanently by the platform's
// writer key. Here the just-minted holder uploads the deterministic render and
// we pin it to R2 at {slug}/{id}.png — write-once, exactly like the contract's
// one-shot Arweave txid. Body = raw PNG bytes. Never a browser snapshot: the
// bytes come from a fresh deterministic engine render at mint time.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getSupabaseService } from '@/lib/supabase';
import { getProject } from '@/lib/project/registry';
import { getPreviewBucket } from '@/lib/cf/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 384px preview PNGs top out ~440KB across the whole catalog; 700KB is generous
// headroom while still rejecting anything abnormal.
const MAX_BYTES = 700 * 1024;
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const POST = requireAuth<{ slug: string; id: string }>(async (req, ctx, address) => {
  const { slug: rawSlug, id: rawId } = await ctx.params;
  const slug = rawSlug?.toLowerCase();
  const tokenId = Number(rawId);
  if (!slug || !getProject(slug) || !Number.isInteger(tokenId) || tokenId < 1) {
    return badRequest('Unknown target');
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_BYTES) return badRequest('Bad image size');
  if (PNG_SIG.some((b, i) => bytes[i] !== b)) return badRequest('Not a PNG');

  // Only the piece's current holder may pin its preview — the writer-key trust,
  // simulated. At mint the minter IS the holder, so legit mints pass; a stranger
  // can't pin a fake image for someone else's token.
  const supabase = getSupabaseService();
  const { data: owned, error: ownErr } = await supabase
    .from('holders')
    .select('token_id')
    .eq('project_id', slug)
    .eq('token_id', String(tokenId))
    .eq('owner_address', address)
    .maybeSingle();
  if (ownErr) return serverError(ownErr);
  if (!owned) return badRequest('Not the holder');

  const bucket = getPreviewBucket();
  if (!bucket) return serverError('preview storage unbound');

  const key = `${slug}/${tokenId}.png`;
  // Write-once: never overwrite an existing pin (the contract's TxidAlreadySet).
  // Deterministic renders make any re-upload identical anyway.
  if (await bucket.head(key)) return NextResponse.json({ ok: true, already: true });

  await bucket.put(key, bytes, {
    httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' },
  });
  return NextResponse.json({ ok: true });
});
