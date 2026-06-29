// Profile sub-route shell — /{handle}/wishlist.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';

type Props = { params: Promise<{ slug: string }> };

export default async function ProfileWishlistPage(props: Props) {
  const params = await props.params;
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  return (
    <main className="proof">
      <h1 className="proof-logo">wishlist</h1>
      <p className="proof-status">
        <strong>/{handle}/wishlist</strong>
        <br />
        Wishlist shell — purchase intent list for {handle}.
      </p>
    </main>
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s wishlist · Price Discussion`,
    alternates: { canonical: `/${handle}/wishlist` },
  };
}
