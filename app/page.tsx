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
    return <HomePageBody initialFeed={initialFeed} />;
}
