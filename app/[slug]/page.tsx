// Root [slug] branch — numeric → Output, alpha → Profile.
// Replaces D1 scaffolds at /token/[id], /profile/[handle], /artist/[handle].
// See: ClickUp doc 2kyd6gx6-994, page 2kyd6gx6-2554
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveSlug } from '@/lib/slug';

type Props = { params: { slug: string } };

export default function SlugRootPage({ params }: Props) {
  const r = resolveSlug(params.slug);
  if (r.kind === 'invalid') notFound();

  if (r.kind === 'output') {
    return (
      <main className="proof">
        <h1 className="proof-logo">output</h1>
        <p className="proof-status">
          <strong>/{r.globalId}</strong>
          <br />
          Output shell. Alt URL: /art/{'{project}'}/{r.globalId}.
        </p>
      </main>
    );
  }

  return (
    <main className="proof">
      <h1 className="proof-logo">profile</h1>
      <p className="proof-status">
        <strong>/{r.handle}</strong>
        <br />
        Profile shell. Sub-routes: /collection, /anointed, /wishlist, /starred,
        /notes, /albums.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const r = resolveSlug(params.slug);
  if (r.kind === 'invalid') {
    return { title: 'Not Found · Price Discussion' };
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
