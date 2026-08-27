// Home / index — `/`.
// Server component: computes the live home payload (stats + uploads +
// minting now) at request time and seeds HomePageBody with it, so the
// carousels + stats are in the FIRST paint — no client-fetch "Loading…"
// gap (Brendon, 2026-06-12). The body keeps re-pulling /api/home live
// (Realtime push + poll) after mount; a DB hiccup here degrades to the
// old client-fetch path instead of failing the page.
import type { Metadata } from 'next';
import HomePageBody from '../components/home/HomePageBody';
import { buildHomeResponse, type HomeResponse } from '../lib/home/homeData';
import { buildDefaultSocialFeed } from '../lib/home/socialFeed';
import type { SocialFeedResponse } from '../lib/home/socialFeed';
import { buildRecentUsers } from '../lib/home/recentUsers';
import type { RecentUserRow } from '../lib/home/recentUsers';
import { getSession } from '../lib/auth/siwe';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Price Discussion',
    alternates: { canonical: '/' },
};

export default async function HomePage() {
    let initialFeed: HomeResponse | null = null;
    try {
        initialFeed = await buildHomeResponse();
    } catch {
        /* degraded: body's client fetch fills in */
    }
    /* Same seed-the-first-paint treatment as the rest of home data (Brendon,
       2026-08-26; follow-up same day — the first pass only seeded the
       logged-out/top-collectors cache key, so any SIGNED-IN viewer still
       opened on ghost rows). Read the SIWE cookie server-side and seed the
       viewer's OWN graph feed when present, top-collectors otherwise — the
       exact same source SocialFeed's client fetch would land on a beat
       later, just already there for first paint. */
    let viewerAddress: string | null = null;
    try {
        const session = await getSession();
        viewerAddress = session.address?.toLowerCase() ?? null;
    } catch {
        /* no session / cookie read failure — anonymous seed below */
    }
    let initialSocialFeed: SocialFeedResponse | null = null;
    try {
        initialSocialFeed = await buildDefaultSocialFeed(viewerAddress);
    } catch {
        /* degraded: SocialFeed's own client fetch fills in, ghost rows stand */
    }
    /* Same treatment for NEW USERS (Brendon, 2026-08-26) — was pure
       client-fetch, so it opened on ghost rows every time even though
       signups never run dry. Anonymous data (no viewer scoping), so no
       cache-key gymnastics needed here. */
    let initialRecentUsers: RecentUserRow[] | null = null;
    try {
        initialRecentUsers = await buildRecentUsers();
    } catch {
        /* degraded: NewUsersFeed's own client fetch fills in, ghost rows stand */
    }
    return (
        <HomePageBody
            initialFeed={initialFeed}
            initialSocialFeed={initialSocialFeed}
            initialSocialFeedViewer={viewerAddress}
            initialRecentUsers={initialRecentUsers}
        />
    );
}
