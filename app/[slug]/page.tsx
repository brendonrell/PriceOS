// Root [slug] branch — numeric → Artwork, alpha → Profile, @-prefix → 301.
// Replaces D1 scaffolds at /token/[id], /profile/[handle], /artist/[handle].
// See: ClickUp doc 2kyd6gx6-994, page 2kyd6gx6-2554 (URL Architecture),
//      page 2kyd6gx6-3274 (Platform Nomenclature SoT).
//
// Profile Page v0 (2026-05-12): profile kind renders <ProfilePageBody />.
// Artwork Page v0 (2026-05-12): output kind renders <ArtworkPageBody />
// (forked from the profile pattern — same hero shell, three tabs:
// Artwork / Albums / + More).
// Nomenclature Sweep (2026-05-13): redirect kind 301s @-prefixed slugs
// to their canonical entity URL (/cto for Users, /art/prisms for Projects).
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { resolveSlug } from '@/lib/slug';
import {
  getUserProfileByHandle,
  getHandleByAddress,
} from '@/lib/profile/getUserProfileByHandle';
import { getUserHoldingsCount, type getUserHoldings } from '@/lib/profile/getUserHoldings';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabase';
import { getArtistStatus } from '@/lib/artists/allowlist';
import ProfilePageBody from '@/components/profile/ProfilePageBody';
import ArtworkPageBody from '@/components/artwork/ArtworkPageBody';
import { profileColorBootScript } from '@/lib/colorway/profileBootPaint';
import { artistSignatureColor, projectsByArtist, artImageUrl, ART_REV } from '@/lib/project/registry';
import { getPreviewBucket } from '@/lib/cf/r2';

// Always render fresh (Brendon 2026-06-12 — collected art was lagging behind
// new mints). Without this the server render (and its seeded holdings) can be
// served from cache, so the Collected grid shows a stale set until something
// else forces a refetch. force-dynamic = the seed is always current.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function SlugRootPage(props: Props) {
  const params = await props.params;
  const r = resolveSlug(params.slug);
  if (r.kind === 'invalid') notFound();

  if (r.kind === 'redirect') {
    // 301 to canonical entity URL. Per Nomenclature Sweep CEO call #7:
    // @-prefix always forwards (not dual-serve with link tags).
    redirect(r.to);
  }

  if (r.kind === 'output') {
    return <ArtworkPageBody globalId={r.globalId} />;
  }

  if (r.kind === 'profileByAddress') {
    // Wallet-address URL (e.g. the /{siweAddress} profile link in settings).
    // Canonicalise to the owner's /{handle}, mirroring the @-prefix 301.
    const handle = await getHandleByAddress(r.address);
    if (!handle) notFound();
    redirect(`/${handle}`);
  }

  // Profile kind — fetch the full row server-side from the handle in the
  // URL so the body renders real values on first paint (no client-fetch
  // popin). 404 when the handle has no row.
  const initialUser = await getUserProfileByHandle(r.handle);
  if (!initialUser) notFound();

  // The collected grid (the heavy query — hundreds of rows) is NO LONGER fetched
  // here. The body already re-fetches it on mount via /api/user/[address]/
  // outputs AND sets the owned count from the same call (see the holdings effect
  // in ProfilePageBody; the count stat reads max(count, holdings.length)
  // meanwhile). Blocking the whole page render on that heavy query was the link
  // lag — the page now paints the instant the profile row resolves, and the grid
  // fills in a beat later (Brendon, 2026-06-25: page instant > grid on first
  // frame). The colour still comes from the profile row above, so no flash.
  const initialHoldings: Awaited<ReturnType<typeof getUserHoldings>> = [];
  const initialOwnedCount = 0;

  // Artist badge — a light allowlist lookup, cheap enough to keep on the render.
  let artistStatus: Awaited<ReturnType<typeof getArtistStatus>> = null;
  try {
    artistStatus = await getArtistStatus(initialUser.address);
  } catch {
    artistStatus = null;
  }

  // Paint the owner's colour into the FIRST frame from the server-known
  // profile_hex, so a cold open / refresh of a profile lands on its colour with
  // no grey flash. Runs before the page content paints; no-ops when the viewer
  // has an explicit colorway pick. Null (no/!invalid hex) → grey default stands.
  // Artists without a picked Profile Colorway wear their signature colour
  // (flagship Project's colorway) instead of the grey default; a saved
  // profile_hex always wins (Brendon, 2026-07-10).
  const ownerHex = initialUser.profile_hex ?? artistSignatureColor(r.handle);
  const colorBoot = profileColorBootScript(ownerHex);

  return (
    <>
      {colorBoot && (
        <script dangerouslySetInnerHTML={{ __html: colorBoot }} />
      )}
      <ProfilePageBody
        handle={r.handle}
        initialUser={initialUser}
        initialHoldings={initialHoldings ?? []}
        initialOwnedCount={initialOwnedCount}
        artistStatus={artistStatus}
      />
    </>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const r = resolveSlug(params.slug);
  if (r.kind === 'invalid') {
    return { title: 'Not Found · Price Discussion' };
  }
  // Redirect kind never renders metadata — the redirect() call short-
  // circuits the request. Return a benign title for the type checker.
  if (r.kind === 'redirect') {
    return { title: 'Price Discussion' };
  }
  if (r.kind === 'output') {
    return {
      title: `#${r.globalId} · Price Discussion`,
      alternates: { canonical: `/${r.globalId}` },
    };
  }
  // Address kind 301s to /{handle} at render time — benign title for the
  // type checker (this metadata is never shown; the redirect short-circuits).
  if (r.kind === 'profileByAddress') {
    return { title: 'Price Discussion' };
  }
  // ARTIST profiles unfurl with their art (Brendon, 2026-07-13 — the artist
  // batch): sharing an artist's page is a gallery invite. The embed leads with
  // the artist's LATEST MINTED piece across all their projects (Brendon,
  // 2026-07-27 — was pinned to first project #1); if that piece's preview
  // isn't stored yet (fresh mint), it falls back to first project #1.
  const artistProjects = projectsByArtist(r.handle.replace(/^@/, ''));
  if (artistProjects.length > 0) {
    let slug = artistProjects[0].slug;
    let pick = 1;
    try {
      const db = getSupabaseService();
      const { data: latest } = await db
        .from('events')
        .select('project_id, token_id')
        .in('project_id', artistProjects.map((p) => p.slug))
        .eq('type', 'MINT')
        .not('token_id', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      const ev = latest as { project_id?: string; token_id?: string | number | null } | null;
      if (ev?.project_id && ev.token_id != null && Number.isFinite(Number(ev.token_id))) {
        slug = ev.project_id;
        pick = Number(ev.token_id);
      }
    } catch { /* fall back to first project #1 */ }
    let hasArt = true;
    try {
      const bucket = getPreviewBucket();
      if (bucket) {
        hasArt = (await bucket.head(`${slug}/${pick}.${ART_REV}.png`)) != null;
        if (!hasArt && (slug !== artistProjects[0].slug || pick !== 1)) {
          // Latest mint has no stored preview yet — the first-project cover
          // is better than no art at all.
          slug = artistProjects[0].slug;
          pick = 1;
          hasArt = (await bucket.head(`${slug}/${pick}.${ART_REV}.png`)) != null;
        }
      }
    } catch { /* keep the candidate */ }
    const art = hasArt ? artImageUrl(slug, pick) : null;
    if (art) {
      const ogTitle = `@${r.handle.replace(/^@/, '')} — artist on Price Discussion`;
      const description = `Generative art by @${r.handle.replace(/^@/, '')} on Price Discussion — ${artistProjects.length} project${artistProjects.length === 1 ? '' : 's'} through the filter.`;
      return {
        title: `${r.handle} · Price Discussion`,
        alternates: { canonical: `/${r.handle}` },
        description,
        openGraph: { title: ogTitle, description, type: 'profile', url: `/${r.handle}`, images: [{ url: art, alt: ogTitle }] },
        twitter: { card: 'summary_large_image', title: ogTitle, description, images: [art] },
      };
    }
  }
  // EVERY profile unfurls SPECIFIC (Brendon, 2026-07-27 — "our sharing still
  // sucks": non-artist profiles fell through to the root defaults, so a shared
  // profile link showed the generic PD blurb). Real facts, cheaply read —
  // member number + since + pieces held + PriceScore — and the card leads with
  // the owner's #1 Showcase piece when one is hung (storage-probed like every
  // other unfurl), else the PD mark.
  const bare = r.handle.replace(/^@/, '');
  const ogTitle = `@${bare} on Price Discussion`;
  let description = `@${bare}'s profile on Price Discussion — the collection, the showcase, and the talk.`;
  let profileArt: string | null = null;
  try {
    const supabase = getSupabaseAnon();
    const { data } = await supabase
      .from('users')
      .select('address, created_at, user_number, price_score, showcase')
      .eq('handle', bare)
      .maybeSingle();
    const row = data as {
      address?: string;
      created_at?: string | null;
      user_number?: number | null;
      price_score?: number | null;
      showcase?: { slots?: ({ project_id?: string; token_id?: number } | null)[] } | null;
    } | null;
    if (row?.address) {
      const pieces = await getUserHoldingsCount(row.address);
      const since = row.created_at
        ? new Date(row.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        : null;
      const member = [
        row.user_number != null ? `member #${row.user_number}` : null,
        since ? `since ${since}` : null,
      ].filter(Boolean).join(' ');
      const facts = [
        member || null,
        `${pieces} ${pieces === 1 ? 'piece' : 'pieces'} held`,
        row.price_score ? `PriceScore ${row.price_score.toLocaleString('en-US')}` : null,
      ].filter(Boolean).join(' · ');
      description = `@${bare} on Price Discussion — ${facts}.`;
      const slot = row.showcase?.slots?.find(
        (sl) => !!sl && !!sl.project_id && sl.token_id != null,
      );
      if (slot?.project_id && slot.token_id != null) {
        let hasArt = true;
        try {
          const bucket = getPreviewBucket();
          if (bucket) hasArt = (await bucket.head(`${slot.project_id}/${slot.token_id}.${ART_REV}.png`)) != null;
        } catch { /* keep the candidate */ }
        if (hasArt) profileArt = artImageUrl(slot.project_id, slot.token_id);
      }
    }
  } catch { /* facts are best-effort — the specific title still ships */ }
  return {
    title: `${r.handle} · Price Discussion`,
    alternates: { canonical: `/${r.handle}` },
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: 'profile',
      url: `/${r.handle}`,
      images: profileArt
        ? [{ url: profileArt, alt: ogTitle }]
        : [{ url: '/icon-1024px.png', width: 1024, height: 1024, alt: 'Price Discussion' }],
    },
    twitter: {
      card: profileArt ? 'summary_large_image' : 'summary',
      title: ogTitle,
      description,
      images: [profileArt ?? '/icon-1024px.png'],
    },
  };
}
