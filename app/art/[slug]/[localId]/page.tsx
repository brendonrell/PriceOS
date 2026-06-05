// Output alt URL shell — /art/{slug}/{localId}.
// Both this URL and /{globalId} render the same ArtworkPageBody;
// canonical points to the bare /{globalId} once the
// (project, localId) ↔ globalId mapping is resolved indexer-side.
// Spec: ClickUp doc 2kyd6gx6-994, page 2kyd6gx6-2554 (Output URLs section).
//
// Artwork Page v0 (2026-05-12): the body uses localId as the
// placeholder globalId for the renderer — the deterministic
// gradient renderer hashes id → spec, so the alt URL paints
// a stable artwork per (slug, localId) pair until the real
// mapping lands.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtworkPageBody from '@/components/artwork/ArtworkPageBody';

type Props = { params: { slug: string; localId: string } };

function isValidProjectSlug(s: string): boolean {
  const lower = s.toLowerCase();
  return /^[a-z0-9-]+$/.test(lower) && lower.length > 0 && lower.length <= 64;
}

function isValidLocalId(s: string): boolean {
  if (!/^\d+$/.test(s)) return false;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return false;
  // Reject leading zeros — `/art/prisms/01` ≠ canonical `/art/prisms/1`
  if (String(n) !== s) return false;
  return true;
}

export default function ProjectOutputPage({ params }: Props) {
  if (!isValidProjectSlug(params.slug)) notFound();
  if (!isValidLocalId(params.localId)) notFound();

  const slug = params.slug.toLowerCase();
  const localId = Number(params.localId);

  // Placeholder globalId — uses localId until the indexer mapping
  // is live. Switches to the resolved globalId in a one-line edit
  // here once the mapping exists; the body contract is unchanged.
  return (
    <ArtworkPageBody
      globalId={localId}
      projectSlug={slug}
      localId={localId}
    />
  );
}

export function generateMetadata({ params }: Props): Metadata {
  if (!isValidProjectSlug(params.slug) || !isValidLocalId(params.localId)) {
    return { title: 'Not Found · Price Discussion' };
  }
  const slug = params.slug.toLowerCase();
  const localId = Number(params.localId);
  // TODO: canonical should point to /{globalId} once indexer mapping is live.
  // Shell omits canonical to avoid self-pointing at the alt URL.
  return {
    title: `${slug} #${localId} · Price Discussion`,
  };
}
