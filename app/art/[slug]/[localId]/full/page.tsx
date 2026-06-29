// Fullscreen artwork view — /art/{slug}/{localId}/full.
// Renders just the live artwork, as large as its aspect ratio allows, in a
// tasteful frame of the user's background colour (no card, no frame). Opened
// from the "Full Screen" link on the artwork feature page.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtworkFullscreen from '@/components/artwork/ArtworkFullscreen';

type Props = { params: Promise<{ slug: string; localId: string }> };

function isValidProjectSlug(s: string): boolean {
  const lower = s.toLowerCase();
  return /^[a-z0-9-]+$/.test(lower) && lower.length > 0 && lower.length <= 64;
}

function isValidLocalId(s: string): boolean {
  if (!/^\d+$/.test(s)) return false;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return false;
  if (String(n) !== s) return false;
  return true;
}

export default async function ArtworkFullscreenPage(props: Props) {
  const params = await props.params;
  if (!isValidProjectSlug(params.slug)) notFound();
  if (!isValidLocalId(params.localId)) notFound();
  return <ArtworkFullscreen slug={params.slug.toLowerCase()} id={Number(params.localId)} />;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  if (!isValidProjectSlug(params.slug) || !isValidLocalId(params.localId)) {
    return { title: 'Not Found · Price Discussion' };
  }
  return { title: `${params.slug.toLowerCase()} #${Number(params.localId)} · Full Screen` };
}
