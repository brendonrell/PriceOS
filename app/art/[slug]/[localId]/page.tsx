// Output alt URL shell — /art/{slug}/{localId}.
// Both this URL and /{globalId} render the same ArtworkPageBody;
// canonical points to the bare /{globalId} once the
// (project, localId) ↔ globalId mapping is resolved indexer-side.
// Spec: ClickUp doc 2kyd6gx6-994, page 2kyd6gx6-2554 (Output URLs section).
//
// Artwork Page v0 (2026-05-12): the body uses localId as the
// placeholder globalId for the renderer — the deterministic
// gradient renderer hashes id → spec, so the alt URL paints
// a stable artwork per (slug, localId) pair until the real
// mapping lands.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtworkPageBody from '@/components/artwork/ArtworkPageBody';
import { getProject } from '@/lib/project/registry';

type Props = { params: Promise<{ slug: string; localId: string }> };

function isValidProjectSlug(s: string): boolean {
  const lower = s.toLowerCase();
  return /^[a-z0-9-]+$/.test(lower) && lower.length > 0 && lower.length <= 64;
}

function isValidLocalId(s: string): boolean {
  if (!/^\d+$/.test(s)) return false;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 1) return false;
  // Reject leading zeros — `/art/prisms/01` ≠ canonical `/art/prisms/1`
  if (String(n) !== s) return false;
  return true;
}

export default async function ProjectOutputPage(props: Props) {
  const params = await props.params;
  if (!isValidProjectSlug(params.slug)) notFound();
  if (!isValidLocalId(params.localId)) notFound();

  const slug = params.slug.toLowerCase();
  const localId = Number(params.localId);

  // Machine-readable facts (agents + search + assistive tech): the piece's
  // deterministic traits derive from the registry with no canvas, so the
  // structured data is free and always current. Best-effort — a trait
  // derivation problem must never take down the page.
  const project = getProject(slug);
  let traits: Record<string, unknown> = {};
  try {
    traits = (project?.traitsOf?.(localId) as Record<string, unknown>) ?? {};
  } catch { /* engine without a calc prefix — ship without traits */ }
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: `${project?.displayName ?? slug} #${localId}`,
    creator: project?.artistHandle
      ? { '@type': 'Person', name: `@${project.artistHandle}` }
      : undefined,
    isPartOf: {
      '@type': 'Collection',
      name: project?.displayName ?? slug,
      size: project?.outputs,
    },
    position: localId,
    artform: 'Generative art',
    artMedium: 'Deterministic on-chain code (rendered live)',
    additionalProperty: Object.entries(traits).map(([name, value]) => ({
      '@type': 'PropertyValue',
      name,
      value: String(value),
    })),
  };

  // Placeholder globalId — uses localId until the indexer mapping
  // is live. Switches to the resolved globalId in a one-line edit
  // here once the mapping exists; the body contract is unchanged.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArtworkPageBody
        globalId={localId}
        projectSlug={slug}
        localId={localId}
      />
    </>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  if (!isValidProjectSlug(params.slug) || !isValidLocalId(params.localId)) {
    return { title: 'Not Found · Price Discussion' };
  }
  const slug = params.slug.toLowerCase();
  const localId = Number(params.localId);
  const project = getProject(slug);
  const name = project?.displayName ?? slug;
  const ogTitle = `${name} #${localId} on Price Discussion`;
  // Description carries the piece's real derived traits so agents + search +
  // link unfurls read WHAT the piece is, not a generic line. Best-effort.
  let traitLine = '';
  try {
    const t = (project?.traitsOf?.(localId) as Record<string, unknown>) ?? {};
    traitLine = Object.entries(t).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join(' · ');
  } catch { /* ship without traits */ }
  const description = [
    `Generative artwork #${localId} of ${project?.outputs ?? '?'}`,
    project?.artistHandle ? `by @${project.artistHandle}` : null,
    `from ${name} on Price Discussion.`,
    traitLine || null,
  ].filter(Boolean).join(' ');
  // TODO: canonical should point to /{globalId} once indexer mapping is live.
  // Shell omits canonical to avoid self-pointing at the alt URL.
  return {
    title: `${name} #${localId} · Price Discussion`,
    description,
    // Share/preview image — the PWA icon, so the OS share sheet + link unfurls
    // for an Output show our mark instead of the browser's generic placeholder.
    openGraph: {
      title: ogTitle,
      type: 'website',
      images: [{ url: '/icon-1024px.png', width: 1024, height: 1024, alt: 'Price Discussion' }],
    },
    twitter: {
      card: 'summary',
      title: ogTitle,
      images: ['/icon-1024px.png'],
    },
  };
}
