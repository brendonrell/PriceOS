// Profile sub-route shell — /{handle}/collection.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// "Collection" is user-side: the outputs this user holds.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: { slug: string } };

export default function ProfileCollectionPage({ params }: Props) {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  return (
    <main className="proof">
      <h1 className="proof-logo">collection</h1>
      <p className="proof-status">
        <strong>/{handle}/collection</strong>
        <br />
        User collection shell — outputs held by {handle}.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s collection · Price Discussion`,
    alternates: { canonical: `/${handle}/collection` },
  };
}
