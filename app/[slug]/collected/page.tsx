// Profile sub-route shell — /{handle}/collected.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// "Collected" is user-side: the outputs this user holds.
// (Renamed from /collection in the 2026-05-12 nomenclature lock.)
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: { slug: string } };

export default function ProfileCollectedPage({ params }: Props) {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  return (
    <main className="proof">
      <h1 className="proof-logo">collected</h1>
      <p className="proof-status">
        <strong>/{handle}/collected</strong>
        <br />
        Collected shell — outputs held by {handle}.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s collected · Price Discussion`,
    alternates: { canonical: `/${handle}/collected` },
  };
}
