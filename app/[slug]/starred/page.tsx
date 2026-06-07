// Profile sub-route shell — /{handle}/starred.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// "Starred" is the frictionless-bookmark feature (renamed from "Stars").
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: { slug: string } };

export default function ProfileStarredPage({ params }: Props) {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  return (
    <main className="proof">
      <h1 className="proof-logo">starred</h1>
      <p className="proof-status">
        <strong>/{handle}/starred</strong>
        <br />
        Starred shell — frictionless bookmarks for {handle}.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s starred · Price Discussion`,
    alternates: { canonical: `/${handle}/starred` },
  };
}
