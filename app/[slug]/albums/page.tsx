// Profile sub-route shell — /{handle}/albums.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// Albums index — listing of albums owned by this user.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: { slug: string } };

export default function ProfileAlbumsPage({ params }: Props) {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  return (
    <main className="proof">
      <h1 className="proof-logo">albums</h1>
      <p className="proof-status">
        <strong>/{handle}/albums</strong>
        <br />
        Albums index shell — albums curated by {handle}.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s albums · Price Discussion`,
    alternates: { canonical: `/${handle}/albums` },
  };
}
