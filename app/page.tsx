// Home / index — `/`.
// Replaces the prior redirect('/art/prisms') stub with the real home
// surface: hero (Price Discussion + live PriceDay) + per-project output
// carousels. Body lives in components/home/HomePageBody (client) so the
// global provider stack in app/layout.tsx wraps it.
import type { Metadata } from 'next';
import HomePageBody from '../components/home/HomePageBody';

export const metadata: Metadata = {
    title: 'Price Discussion',
    alternates: { canonical: '/' },
};

export default function HomePage() {
    return <HomePageBody />;
}
