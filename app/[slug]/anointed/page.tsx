// Profile sub-route — /{handle}/anointed.
// Renders only for valid profile handles; numeric/reserved/invalid → 404.
// The real anointing list: the pieces this user has anointed (a public,
// strongest-tastemaker signal). Server component, mirrors the sibling
// sub-routes' shape + CSS classes (proof / proof-logo / proof-status).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveProfileHandle } from '@/lib/slug';
import { getUserProfileByHandle } from '@/lib/profile/getUserProfileByHandle';
import { getSupabaseAnon } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

interface AnointedPiece {
  project_id: string;
  token_id: string;
  created_at: string;
}

/** Resolve handle → address → the user's anointed pieces (newest first).
 *  Anon client, RLS-bound, reads only. Returns [] when the user has no row
 *  or no anoints; the page renders the empty state for that. */
async function getAnointedPieces(handle: string): Promise<AnointedPiece[]> {
  const profile = await getUserProfileByHandle(handle);
  if (!profile) return [];

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from('anointments')
    .select('project_id, token_id, created_at')
    .eq('user_address', profile.address)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  // Cast around Supabase typed-client `never` inference on the new table.
  return (data ?? []) as AnointedPiece[];
}

export default async function ProfileAnointedPage({ params }: Props) {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) notFound();

  const pieces = await getAnointedPieces(handle);

  return (
    <main className="proof">
      <h1 className="proof-logo">anointed</h1>
      {pieces.length === 0 ? (
        <p className="proof-status">
          <strong>/{handle}/anointed</strong>
          <br />
          {handle} hasn&rsquo;t anointed anything yet.
        </p>
      ) : (
        <ul className="proof-status">
          {pieces.map((p) => (
            <li key={`${p.project_id}:${p.token_id}`}>
              {p.project_id} #{p.token_id}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const handle = resolveProfileHandle(params.slug);
  if (!handle) return { title: 'Not Found · Price Discussion' };
  return {
    title: `${handle}'s anointed · Price Discussion`,
    alternates: { canonical: `/${handle}/anointed` },
  };
}
