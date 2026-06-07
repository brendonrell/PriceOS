// Profile sub-route shell — /{handle}/anointed.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: { slug: string } };

export default function ProfileAnointedPage({ params }: Props) {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  return (
    <main className="proof">
      <h1 className="proof-logo">anointed</h1>
      <p className="proof-status">
        <strong>/{handle}/anointed</strong>
        <br />
        Anointment selections shell — outputs {handle} has anointed.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s anointed · Price Discussion`,
    alternates: { canonical: `/${handle}/anointed` },
  };
}
