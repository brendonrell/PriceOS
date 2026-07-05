// POST /api/preview/[slug]/[id] — the Arweave preview WRITER, simulated.
//
// Mirrors the real on-chain flow (pd-contracts): a piece's deterministic
// preview.png is pinned once and permanently to R2 at {slug}/{id}.png —
// write-once, exactly like the contract's one-shot Arweave txid. Body = raw PNG
// bytes from a fresh deterministic engine render (never a screen snapshot).
//
// Open on purpose: the render is fully determined by (slug, tokenId), so ANYONE
// who views the piece reproduces the exact same image — there is nothing to
// fake. No sign-in required, so a missing preview self-heals for the very first
// viewer (logged in or not). The only guards that matter: the piece must be a
// real minted token (blocks junk-id storage spam), and write-once means an
// existing pin can never be overwritten.

import { NextResponse } from 'next/server';
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

export async function POST(req: Request, ctx: { params: Promise<{ slug: string; id: string }> }): Promise<NextResponse> {
  const { slug: rawSlug, id: rawId } = await ctx.params;
  const slug = rawSlug?.toLowerCase();
  const tokenId = Number(rawId);
  if (!slug || !getProject(slug) || !Number.isInteger(tokenId) || tokenId < 1) {
    return badRequest('Unknown target');
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_BYTES) return badRequest('Bad image size');
  if (PNG_SIG.some((b, i) => bytes[i] !== b)) return badRequest('Not a PNG');

  const bucket = getPreviewBucket();
  if (!bucket) return serverError('preview storage unbound');

  const key = `${slug}/${tokenId}.png`;
  // Write-once: never overwrite an existing pin (the contract's TxidAlreadySet).
  // Deterministic renders make any re-upload identical anyway. Checked before the
  // DB read so an already-healed piece costs nothing.
  if (await bucket.head(key)) return NextResponse.json({ ok: true, already: true });

  // Must be a REAL minted piece — the only thing an open writer must enforce, so
  // nobody fills storage with images for tokens that don't exist.
  const supabase = getSupabaseService();
  const { data: minted, error } = await supabase
    .from('holders')
    .select('token_id')
    .eq('project_id', slug)
    .eq('token_id', String(tokenId))
    .maybeSingle();
  if (error) return serverError(error);
  if (!minted) return badRequest('Not a minted piece');

  await bucket.put(key, bytes, {
    httpMetadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' },
  });
  return NextResponse.json({ ok: true });
}
