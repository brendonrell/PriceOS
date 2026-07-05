// POST /api/ascii/[slug]/[id] — the ASCII Backup WRITER, simulated Arweave-style.
//
// Exact mirror of the preview-PNG writer (/api/preview/[slug]/[id]): at mint the
// client derives the piece's deterministic ASCII artifact (raw text + colour
// layer, lib/art/ascii.ts) from the same fresh engine render that produced the
// preview PNG, and pins it once and permanently to R2 at {slug}/{id}.ascii.json.
//
// Open on purpose: the artifact is fully determined by (slug, tokenId), so ANYONE
// who views the piece reproduces the exact same bytes — nothing to fake. The only
// guards that matter: strict artifact-shape validation, the piece must be a real
// minted token, and write-once means an existing pin can never be overwritten.

import { NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getSupabaseService } from '@/lib/supabase';
import { getProject } from '@/lib/project/registry';
import { getPreviewBucket } from '@/lib/cf/r2';
import { isValidAsciiArtifact } from '@/lib/art/ascii';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A full 192×~115 artifact runs ≈75KB; 300KB is generous headroom while still
// rejecting anything abnormal.
const MAX_BYTES = 300 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ slug: string; id: string }> }): Promise<NextResponse> {
  const { slug: rawSlug, id: rawId } = await ctx.params;
  const slug = rawSlug?.toLowerCase();
  const tokenId = Number(rawId);
  if (!slug || !getProject(slug) || !Number.isInteger(tokenId) || tokenId < 1) {
    return badRequest('Unknown target');
  }

  const raw = await req.text();
  if (!raw || raw.length > MAX_BYTES) return badRequest('Bad artifact size');
  let artifact: unknown;
  try {
    artifact = JSON.parse(raw);
  } catch {
    return badRequest('Not JSON');
  }
  if (!isValidAsciiArtifact(artifact)) return badRequest('Not an ASCII artifact');
  // The artifact must claim exactly the piece it's being pinned under.
  if (artifact.project !== slug || artifact.token !== tokenId) return badRequest('Artifact/target mismatch');

  const bucket = getPreviewBucket();
  if (!bucket) return serverError('preview storage unbound');

  const key = `${slug}/${tokenId}.ascii.json`;
  // Write-once: never overwrite an existing pin (the contract's TxidAlreadySet).
  // Deterministic derivation makes any re-upload identical anyway. Checked before
  // the DB read so an already-pinned piece costs nothing.
  if (await bucket.head(key)) return NextResponse.json({ ok: true, already: true });

  // Must be a REAL minted piece — the only thing an open writer must enforce, so
  // nobody fills storage with artifacts for tokens that don't exist.
  const supabase = getSupabaseService();
  const { data: minted, error } = await supabase
    .from('holders')
    .select('token_id')
    .eq('project_id', slug)
    .eq('token_id', String(tokenId))
    .maybeSingle();
  if (error) return serverError(error);
  if (!minted) return badRequest('Not a minted piece');

  await bucket.put(key, raw, {
    httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=31536000, immutable' },
  });
  return NextResponse.json({ ok: true });
}
