// Profile sub-route shell — /{handle}/notes.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// Notes are private — only owner can view (auth gate added in v0 work).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: { slug: string } };

export default function ProfileNotesPage({ params }: Props) {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  return (
    <main className="proof">
      <h1 className="proof-logo">notes</h1>
      <p className="proof-status">
        <strong>/{handle}/notes</strong>
        <br />
        Notes shell — private notes (owner-only view). Auth gate added in v0.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s notes · Price Discussion`,
    alternates: { canonical: `/${handle}/notes` },
    robots: { index: false, follow: false },
  };
}
