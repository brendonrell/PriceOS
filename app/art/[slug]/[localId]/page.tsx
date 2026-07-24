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
import { cache } from 'react';
import { notFound } from 'next/navigation';
import ArtworkPageBody from '@/components/artwork/ArtworkPageBody';
import { getProject, artImageUrl, ART_REV } from '@/lib/project/registry';
import { getPreviewBucket } from '@/lib/cf/r2';
import { getSupabaseService } from '@/lib/supabase';
import { jsonLdScript } from '@/lib/jsonLd';

type Props = { params: Promise<{ slug: string; localId: string }> };

/* Live facts for the machine-readable layer — the piece's stored Reads-As
   scene sentence + its cheapest active listing. Best-effort (page renders
   fine without them) and request-deduped via cache() so metadata + body
   share ONE read. Query shapes mirror the outputs/story routes. */
const fetchOutputFacts = cache(
  async (
    slug: string,
    tokenId: number,
  ): Promise<{ scene: string | null; listedEth: number | null; hasStoredArt: boolean }> => {
    try {
      const supabase = getSupabaseService();
      const now = new Date().toISOString();
      const [o, l, proj] = await Promise.all([
        supabase
          .from('outputs')
          .select('scene')
          .eq('project_id', slug)
          .eq('token_id', String(tokenId))
          .maybeSingle(),
        supabase
          .from('listings')
          .select('price_eth')
          .eq('project_id', slug)
          .eq('token_id', String(tokenId))
          .eq('active', true)
          .or(`end_time.is.null,end_time.gt.${now}`)
          .order('price_eth', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('projects')
          .select('minted_count')
          .eq('id', slug)
          .maybeSingle(),
      ]);
      const scene = (o.data as { scene?: string | null } | null)?.scene ?? null;
      const p = (l.data as { price_eth?: string | number | null } | null)?.price_eth;
      const listedEth = p != null && Number(p) > 0 ? Number(p) : null;
      // Share-image gate: the stored preview must ACTUALLY exist. On the
      // Worker we hold the art bucket binding, so ask it directly (previews
      // pin on first view — minted-but-never-viewed pieces have none, and an
      // unfurler pointed at a 404 renders a naked embed). Outside the Worker
      // (local build), fall back to "minted" (ids mint 1..minted_count).
      const minted = tokenId <= (((proj.data as { minted_count?: number } | null)?.minted_count) ?? 0);
      let hasStoredArt = minted;
      try {
        const bucket = getPreviewBucket();
        if (bucket) hasStoredArt = (await bucket.head(`${slug}/${tokenId}.${ART_REV}.png`)) != null;
      } catch { /* keep the minted fallback */ }
      return { scene, listedEth, hasStoredArt };
    } catch {
      return { scene: null, listedEth: null, hasStoredArt: false };
    }
  },
);

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
  const facts = await fetchOutputFacts(slug, localId);
  const { scene, listedEth } = facts;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: `${project?.displayName ?? slug} #${localId}`,
    // The Reads-As scene sentence IS the visual description — what the piece
    // literally looks like, computed from its own pixels.
    description: scene ?? undefined,
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
    offers: listedEth
      ? {
          '@type': 'Offer',
          price: listedEth,
          priceCurrency: 'ETH',
          availability: 'https://schema.org/InStock',
        }
      : undefined,
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
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
  const { scene, listedEth, hasStoredArt } = await fetchOutputFacts(slug, localId);
  const description = [
    `Generative artwork #${localId} of ${project?.outputs ?? '?'}`,
    project?.artistHandle ? `by @${project.artistHandle}` : null,
    `from ${name} on Price Discussion.`,
    scene ? `Reads as: ${scene}.` : null,
    listedEth ? `Listed at ${listedEth} ETH.` : null,
    traitLine || null,
  ].filter(Boolean).join(' ');
  // Share/unfurl image — THE PIECE ITSELF (its stored preview PNG, served
  // publicly from our own /preview route), as a large card. Sharing an Output
  // is PD's word-of-mouth engine; the art must be the first thing anyone sees.
  // Unminted ids have no stored preview, so they fall back to the PD mark.
  const art = hasStoredArt ? artImageUrl(slug, localId) : null;
  const ogImages = art
    ? [{ url: art, alt: ogTitle }]
    : [{ url: '/icon-1024px.png', width: 1024, height: 1024, alt: 'Price Discussion' }];
  // TODO: canonical should point to /{globalId} once indexer mapping is live.
  // Shell omits canonical to avoid self-pointing at the alt URL.
  return {
    title: `${name} #${localId} · Price Discussion`,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `/art/${slug}/${localId}`,
      images: ogImages,
    },
    twitter: {
      card: art ? 'summary_large_image' : 'summary',
      title: ogTitle,
      description,
      images: [art ?? '/icon-1024px.png'],
    },
  };
}
