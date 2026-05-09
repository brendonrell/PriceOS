// Project page shell — /art/{slug}.
// Replaces D1 scaffolds at /collection/[slug] and /mint/[slug].
// Mint UI lives inside this page during the mint window;
// no separate /mint/{slug} route exists.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = { params: { slug: string } };

function isValidProjectSlug(s: string): boolean {
  const lower = s.toLowerCase();
  return /^[a-z0-9-]+$/.test(lower) && lower.length > 0 && lower.length <= 64;
}

export default function ProjectPage({ params }: Props) {
  if (!isValidProjectSlug(params.slug)) notFound();
  const slug = params.slug.toLowerCase();

  return (
    <main className="proof">
      <h1 className="proof-logo">project</h1>
      <p className="proof-status">
        <strong>/art/{slug}</strong>
        <br />
        Project shell. Mint UI mounts here during mint window.
      </p>
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  if (!isValidProjectSlug(params.slug)) {
    return { title: 'Not Found · Price Discussion' };
  }
  const slug = params.slug.toLowerCase();
  return {
    title: `${slug} · Price Discussion`,
    alternates: { canonical: `/art/${slug}` },
  };
}
