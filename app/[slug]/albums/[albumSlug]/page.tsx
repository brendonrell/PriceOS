// Profile sub-route shell — /{handle}/albums/{albumSlug}.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// Album slug must be non-empty alphanumeric/hyphen.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: Promise<{ slug: string; albumSlug: string }> };

function isValidAlbumSlug(s: string): boolean {
  return /^[a-z0-9-]+$/.test(s.toLowerCase()) && s.length > 0 && s.length <= 64;
}

export default async function ProfileAlbumDetailPage(props: Props) {
  const params = await props.params;
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();
  if (!isValidAlbumSlug(params.albumSlug)) notFound();

  const albumSlug = params.albumSlug.toLowerCase();

  return (
    <main className="proof">
      <h1 className="proof-logo">album</h1>
      <p className="proof-status">
        <strong>/{handle}/albums/{albumSlug}</strong>
        <br />
        Album detail shell — curated by {handle}.
      </p>
    </main>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const handle = resolveProfileHandle(params.slug);
  if (!handle || !isValidAlbumSlug(params.albumSlug)) {
    return { title: 'Not Found · Price Discussion' };
  }
  const albumSlug = params.albumSlug.toLowerCase();
  return {
    title: `${albumSlug} — ${handle} · Price Discussion`,
    alternates: { canonical: `/${handle}/albums/${albumSlug}` },
  };
}
