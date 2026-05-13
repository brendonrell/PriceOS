// Root [slug] branch — numeric → Artwork, alpha → Profile, @-prefix → 301.
// Replaces D1 scaffolds at /token/[id], /profile/[handle], /artist/[handle].
// See: ClickUp doc 2kyd6gx6-994, page 2kyd6gx6-2554 (URL Architecture),
//      page 2kyd6gx6-3274 (Platform Nomenclature SoT).
//
// Profile Page v0 (2026-05-12): profile kind renders <ProfilePageBody />.
// Artwork Page v0 (2026-05-12): output kind renders <ArtworkPageBody />
// (forked from the profile pattern — same hero shell, three tabs:
// Artwork / Albums / + More).
// Nomenclature Sweep (2026-05-13): redirect kind 301s @-prefixed slugs
// to their canonical entity URL (/cto for Users, /art/prisms for Projects).
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { resolveSlug } from '@/lib/slug';
import ProfilePageBody from '@/components/profile/ProfilePageBody';
import ArtworkPageBody from '@/components/artwork/ArtworkPageBody';

type Props = { params: { slug: string } };

export default function SlugRootPage({ params }: Props) {
  const r = resolveSlug(params.slug);
  if (r.kind === 'invalid') notFound();

  if (r.kind === 'redirect') {
    // 301 to canonical entity URL. Per Nomenclature Sweep CEO call #7:
    // @-prefix always forwards (not dual-serve with link tags).
    redirect(r.to);
  }

  if (r.kind === 'output') {
    return <ArtworkPageBody globalId={r.globalId} />;
  }

  // Profile kind — Profile Page v0 body.
  // Sub-routes: /collected, /anointed, /wishlist, /starred, /notes,
  // /albums. (Collection → Collected lock landed with this build.)
  return <ProfilePageBody />;
}

export function generateMetadata({ params }: Props): Metadata {
  const r = resolveSlug(params.slug);
  if (r.kind === 'invalid') {
    return { title: 'Not Found · Price Discussion' };
  }
  // Redirect kind never renders metadata — the redirect() call short-
  // circuits the request. Return a benign title for the type checker.
  if (r.kind === 'redirect') {
    return { title: 'Price Discussion' };
  }
  if (r.kind === 'output') {
    return {
      title: `#${r.globalId} · Price Discussion`,
      alternates: { canonical: `/${r.globalId}` },
    };
  }
  return {
    title: `${r.handle} · Price Discussion`,
    alternates: { canonical: `/${r.handle}` },
  };
}
