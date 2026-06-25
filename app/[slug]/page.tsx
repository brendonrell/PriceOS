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
import { getUserHoldings, getUserHoldingsCount } from '@/lib/profile/getUserHoldings';
import { getArtistStatus } from '@/lib/artists/allowlist';
import ProfilePageBody from '@/components/profile/ProfilePageBody';
import ArtworkPageBody from '@/components/artwork/ArtworkPageBody';
import { profileColorBootScript } from '@/lib/colorway/profileBootPaint';

// Always render fresh (Brendon 2026-06-12 — collected art was lagging behind
// new mints). Without this the server render (and its seeded holdings) can be
// served from cache, so the Collected grid shows a stale set until something
// else forces a refetch. force-dynamic = the seed is always current.
export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export default async function SlugRootPage({ params }: Props) {
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

  // Holdings ship with the page too (perf batch 2026-06-10) — same query the
  // /api/user/[address]/outputs route runs, done in-process so the Collected
  // grid paints on arrival instead of after a client round-trip. The client
  // still re-fetches via the route on 'pd:project-refresh' (mint / market
  // actions). Best-effort: a holdings error falls back to the old behavior
  // (empty seed; nothing renders worse than before this change).
  let initialHoldings: Awaited<ReturnType<typeof getUserHoldings>> = [];
  let initialOwnedCount = 0;
  try {
    initialHoldings = (await getUserHoldings(initialUser.address)) ?? [];
    // Exact owned total (holdings caps at 1000 rows) so the stat is right on
    // first paint (Brendon 2026-06-19).
    initialOwnedCount = await getUserHoldingsCount(initialUser.address);
  } catch {
    initialHoldings = [];
  }

  // Artist badge — whitelist + cooldown status from the allowlist (the sim
  // stand-in for the on-chain whitelist). Best-effort: a lookup error means
  // no badge, never a broken profile.
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
  const colorBoot = profileColorBootScript(initialUser.profile_hex);

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

export function generateMetadata({ params }: Props): Metadata {
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
  return {
    title: `${r.handle} · Price Discussion`,
    alternates: { canonical: `/${r.handle}` },
  };
}
